"""Context-aware intent router.

Routing has four layers, evaluated in order of precedence:

1. **Explicit** — the user picked a workflow in the UI. Highest precedence.
2. **Contextual follow-up** — a short/elliptical message continuing the same
   conversation (same session, previous workflow known). Inherits the previous
   workflow while still allowing a signal-driven upgrade.
3. **Deterministic signal matching** — weighted keyword/pattern scoring per
   workflow. Never regex-only: every match contributes a score and the reason
   is recorded for audit.
4. **Fallback** — ``INFORMATIONAL``.

Every result includes :class:`RoutingMeta` so decisions can be audited and
debugged without re-running the router.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from .prompts import WORKFLOW_INSTRUCTIONS  # noqa: F401  (re-export convenience)
from .schemas import RoutingMeta, WorkflowRoute

# ── Signal dictionary ─────────────────────────────────────────────────────
# Each entry: (regex, weight, human label). Indonesian + English synonyms.
_DIAGNOSTIC_SIGNALS: list[tuple[re.Pattern[str], int, str]] = [
    (re.compile(r"\b(mengapa|kenapa|penyebab|sebab)\b"), 3, "kata tanya sebab"),
    (re.compile(r"\b(diagnos\w*)\b"), 3, "diagnosa"),
    (re.compile(r"\b(turun|menurun|anjlok|drop|jatuh|melemah)\b"), 2, "penurunan"),
    (re.compile(r"\b(masalah|problem|kendala|issue|kerugian|rugi|merugi)\b"), 2, "masalah"),
    (re.compile(r"\b(analisis|analisa|analyy?ze|investigasi)\b"), 1, "analisis"),
    (re.compile(r"\b(margin\s+(?:negatif|minus))\b"), 3, "margin negatif"),
    (re.compile(r"\b(data\s+(?:buruk|kotor|tidak\s+lengkap|missing))\b"), 2, "kualitas data"),
    (re.compile(r"\b(apa\s+yang\s+salah|root\s+cause)\b"), 3, "root cause"),
]

_GOAL_SIGNALS: list[tuple[re.Pattern[str], int, str]] = [
    (re.compile(r"\b(target|goal|sasaran)\b"), 3, "target"),
    (re.compile(r"\b(tingkatkan|meningkatkan|naikkan|menaikkan|boost)\b"), 3, "peningkatan"),
    (re.compile(r"\b(optimalkan|optimasi|optimize|maksimalkan)\b"), 3, "optimasi"),
    (re.compile(r"\b(strategi|rencana|plan|roadmap|aksi|action)\b"), 2, "rencana"),
    (re.compile(r"\b(simulas\w*|promo|diskon|disk o?\w*)\b"), 2, "simulasi/promo"),
    (re.compile(r"\b(ingin|mau|butuh|harus)\s+(?:naik|mencapai|capai|mendapat)\b"), 2, "keinginan"),
    (re.compile(r"\b(berapa\s+(?:persen|%)\s+(?:lagi|supaya|agar))\b"), 3, "kuantifikasi target"),
    (re.compile(r"\b(cara|bagaimana\s+cara|gimana\s+cara)\s+(?:untuk\s+)?(?:menaikkan|meningkatkan|mencapai)\b"), 3, "cara mencapai"),
]

_INFORMATIONAL_SIGNALS: list[tuple[re.Pattern[str], int, str]] = [
    (re.compile(r"\b(apa\s+itu|apakah|definisi|pengertian|maksud)\b"), 2, "definisi"),
    (re.compile(r"\b(berapa|jumlah|total|ringkasan|summary|rekap)\b"), 2, "kuantitatif"),
    (re.compile(r"\b(tampilkan|lihat|show|tunjukkan|daftar|list)\b"), 1, "permintaan data"),
    (re.compile(r"\b(bandingkan|perbandingan|compare|vs|versus)\b"), 1, "perbandingan"),
    (re.compile(r"\b(produk|outlet|penjualan|omzet|pendapatan|transaksi|unit)\b"), 1, "entitas bisnis"),
]

# Short messages that almost always mean "continue the previous turn".
_FOLLOWUP_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^(dan|lalu|terus|kalau|jika|bagaimana\s+(?:kalau|jika|dengan)|gimana\s+(?:kalau|jika)|what\s+if)\b"),
    re.compile(r"\b(bulan\s+lalu|periode\s+sebelumnya|kemarin|minggu\s+lalu|tahun\s+lalu|tadi|sebelumnya)\b"),
    re.compile(r"\b(outlet\s+(?:itu|tersebut|lain|sama)|produk\s+(?:itu|tersebut|lain))\b"),
    re.compile(r"^(lebih\s+|kurang\s+|terus\s+)?(baik|buruk|tinggi|rendah|besar|kecil)\??$"),
    re.compile(r"^(maksudnya|lanjut|teruskan|jelaskan\s+lagi|detail)\??$"),
]

_ANAPHORA = re.compile(r"\b(itu|tersebut|nya|tadi|sebelumnya|sama|tadi\s+itu)\b")


@dataclass(frozen=True)
class PreviousTurn:
    """Minimal view of conversation history needed for contextual routing."""

    last_user_message: str = ""
    last_workflow: WorkflowRoute | None = None
    message_count: int = 0


@dataclass(frozen=True)
class RoutingDecision:
    workflow: WorkflowRoute
    meta: RoutingMeta = field(default_factory=lambda: RoutingMeta(method="fallback", reason="default"))


def normalize(text: str) -> str:
    """Lowercase, strip diacritics and collapse whitespace for matching."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("persen", " % ")
    text = re.sub(r"[“”‘’\"']", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _score(text: str, signals: list[tuple[re.Pattern[str], int, str]]) -> tuple[int, list[str]]:
    total = 0
    hits: list[str] = []
    for pattern, weight, label in signals:
        if pattern.search(text):
            total += weight
            hits.append(label)
    return total, hits


def is_followup(text: str, previous: PreviousTurn | None) -> bool:
    """Heuristic: does this message continue the previous turn?"""
    if previous is None or previous.message_count == 0:
        return False
    normalized = normalize(text)
    word_count = len(normalized.split())
    if any(p.search(normalized) for p in _FOLLOWUP_PATTERNS):
        return True
    # Very short messages with anaphora in an ongoing conversation.
    if word_count <= 6 and _ANAPHORA.search(normalized):
        return True
    return False


class IntentRouter:
    """Deterministic, auditable, context-aware workflow router."""

    def route_decision(
        self,
        message: str,
        requested: WorkflowRoute = WorkflowRoute.AUTO,
        *,
        previous: PreviousTurn | None = None,
    ) -> RoutingDecision:
        # 1) Explicit user selection always wins.
        if requested not in (WorkflowRoute.AUTO, None):
            return RoutingDecision(
                workflow=requested,
                meta=RoutingMeta(method="explicit", reason=f"Pengguna memilih workflow {requested.value}."),
            )

        text = normalize(message)
        diag_score, diag_hits = _score(text, _DIAGNOSTIC_SIGNALS)
        goal_score, goal_hits = _score(text, _GOAL_SIGNALS)
        info_score, info_hits = _score(text, _INFORMATIONAL_SIGNALS)

        followup = is_followup(message, previous)
        previous_workflow = previous.last_workflow if previous else None

        if followup:
            # Continue the prior workflow unless the new message clearly signals
            # a different intent (>= 3 points of evidence for another workflow).
            candidate = previous_workflow or WorkflowRoute.INFORMATIONAL
            alternatives = {
                WorkflowRoute.DIAGNOSTIC: diag_score,
                WorkflowRoute.GOAL_DIRECTED: goal_score,
                WorkflowRoute.INFORMATIONAL: info_score,
            }
            best_alt, best_alt_score = max(alternatives.items(), key=lambda item: item[1])
            if best_alt != candidate and best_alt_score >= 3 and best_alt_score > alternatives[candidate] + 1:
                return RoutingDecision(
                    workflow=best_alt,
                    meta=RoutingMeta(
                        method="contextual",
                        previous_workflow=previous_workflow.value if previous_workflow else None,
                        followup_detected=True,
                        matched_signals=[*diag_hits, *goal_hits, *info_hits],
                        reason=f"Follow-up dengan sinyal kuat {best_alt.value} ({best_alt_score} poin) menimpa workflow sebelumnya.",
                    ),
                )
            return RoutingDecision(
                workflow=candidate,
                meta=RoutingMeta(
                    method="contextual",
                    previous_workflow=previous_workflow.value if previous_workflow else None,
                    followup_detected=True,
                    matched_signals=[*diag_hits, *goal_hits, *info_hits],
                    reason=f"Follow-up dalam sesi yang sama; melanjutkan workflow {candidate.value}.",
                ),
            )

        # 3) Deterministic weighted scoring.
        scores = {
            WorkflowRoute.DIAGNOSTIC: diag_score,
            WorkflowRoute.GOAL_DIRECTED: goal_score,
            WorkflowRoute.INFORMATIONAL: info_score,
        }
        order = [WorkflowRoute.DIAGNOSTIC, WorkflowRoute.GOAL_DIRECTED, WorkflowRoute.INFORMATIONAL]
        best = max(order, key=lambda w: (scores[w], -order.index(w)))
        if scores[best] > 0:
            hits = {WorkflowRoute.DIAGNOSTIC: diag_hits, WorkflowRoute.GOAL_DIRECTED: goal_hits, WorkflowRoute.INFORMATIONAL: info_hits}[best]
            return RoutingDecision(
                workflow=best,
                meta=RoutingMeta(
                    method="deterministic",
                    previous_workflow=previous_workflow.value if previous_workflow else None,
                    matched_signals=hits,
                    reason=f"Skor sinyal tertinggi: {best.value} ({scores[best]} poin).",
                ),
            )

        # 4) Deterministic fallback.
        return RoutingDecision(
            workflow=WorkflowRoute.INFORMATIONAL,
            meta=RoutingMeta(
                method="deterministic",
                previous_workflow=previous_workflow.value if previous_workflow else None,
                matched_signals=[],
                reason="Tidak ada sinyal kuat; fallback ke informational.",
            ),
        )

    def route(
        self,
        message: str,
        requested: WorkflowRoute = WorkflowRoute.AUTO,
        *,
        previous: PreviousTurn | None = None,
    ) -> WorkflowRoute:
        """Compatibility helper returning only the workflow enum."""
        return self.route_decision(message, requested, previous=previous).workflow
