"""Predictive monitoring: compare predicted baseline to recorded actuals.

Rules:
- Never invent an actual. If no actual exists, status = ``insufficient_data``.
- Variance is computed deterministically.
- Thresholds are read from the baseline.
- Cumulative aggregation is opt-in and documented; the default is to compare
  the *latest* actual value to the baseline to avoid double-counting.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from ..analytics.metrics import variance


class MonitoringStatus:
    ON_TRACK = "on_track"
    WARNING = "warning"
    CRITICAL = "critical"
    INSUFFICIENT_DATA = "insufficient_data"


@dataclass(frozen=True)
class VarianceResult:
    status: str
    predicted: float
    actual: float | None
    variance: float | None
    variance_pct: float | None
    breaches: list[str]


def evaluate(actual: float | None, predicted: float, *, warning_pct: float = 10.0, critical_pct: float = 20.0) -> VarianceResult:
    """Compare one actual figure to a predicted baseline."""
    if actual is None:
        return VarianceResult(MonitoringStatus.INSUFFICIENT_DATA, predicted, None, None, None, [])
    if predicted <= 0:
        raise ValueError("predicted baseline must be positive")
    diff, pct = variance(Decimal(str(actual)), Decimal(str(predicted)))
    abs_pct = abs(pct)
    breaches: list[str] = []
    if abs_pct >= Decimal(str(critical_pct)):
        status = MonitoringStatus.CRITICAL
        breaches.append(f"Deviasi {pct}% melewati batas kritis {critical_pct}%.")
    elif abs_pct >= Decimal(str(warning_pct)):
        status = MonitoringStatus.WARNING
        breaches.append(f"Deviasi {pct}% melewati batas peringatan {warning_pct}%.")
    else:
        status = MonitoringStatus.ON_TRACK
    return VarianceResult(status, predicted, actual, float(diff), float(pct), breaches)


def summarize_baseline(
    records: list[dict],
    predicted: float,
    *,
    warning_pct: float = 10.0,
    critical_pct: float = 20.0,
    cumulative: bool = False,
) -> dict:
    """Return a baseline summary.

    * ``cumulative=False`` (default) compares the most recent record only,
      which is correct when records represent full-period snapshots.
    * ``cumulative=True`` sums all records, which is appropriate for records
      that represent partial daily/weekly contributions.
    """
    if not records:
        latest = evaluate(None, predicted, warning_pct=warning_pct, critical_pct=critical_pct)
        return {
            "status": latest.status,
            "predicted": predicted,
            "actual": None,
            "variance": None,
            "variance_pct": None,
            "breaches": [],
            "record_count": 0,
            "insight": "Belum ada data aktual untuk dibandingkan. Tambahkan actual untuk memulai pemantauan.",
        }

    if cumulative:
        actual_value = sum(float(r["actual_value"]) for r in records)
    else:
        actual_value = float(records[-1]["actual_value"])

    latest = evaluate(actual_value, predicted, warning_pct=warning_pct, critical_pct=critical_pct)
    insight_map = {
        MonitoringStatus.ON_TRACK: "Kinerja dalam batas toleransi terhadap prediksi.",
        MonitoringStatus.WARNING: "Deviasi terdeteksi; tinjau strategi promo.",
        MonitoringStatus.CRITICAL: "Deviasi kritis; pertimbangkan penyesuaian atau penghentian.",
        MonitoringStatus.INSUFFICIENT_DATA: "Belum ada data aktual.",
    }
    return {
        "status": latest.status,
        "predicted": predicted,
        "actual": latest.actual,
        "variance": latest.variance,
        "variance_pct": latest.variance_pct,
        "breaches": latest.breaches,
        "record_count": len(records),
        "insight": insight_map.get(latest.status, "Status tidak dikenal."),
        "cumulative": cumulative,
    }


def status_from_variance(variance_pct: float, warning_pct: float, critical_pct: float) -> str:
    """Pure helper for clients that already know the percentage."""
    if abs(variance_pct) >= critical_pct:
        return MonitoringStatus.CRITICAL
    if abs(variance_pct) >= warning_pct:
        return MonitoringStatus.WARNING
    return MonitoringStatus.ON_TRACK
