# TARA AGENT — Execution Progress

> Checkpoint file untuk melanjutkan pekerjaan meskipun sesi terputus.
> Update file ini di akhir setiap phase.

---

## State terakhir

**Tanggal:** 2026-02-19
**Phase aktif:** PHASE 0 — Audit selesai, lanjut PHASE 1
**Branch:** `feat/tara-full-stack-stabilization` (dibuat dari `main`, belum di-push)
**Virtualenv:** `.venv` → Python 3.11.0, dependency backend terverifikasi terpasang

---

## Phase 0 — Audit baseline (SELESAI)

### Git
- Branch aktif: `feat/tara-full-stack-stabilization`
- 16 file modified + 9 untracked pada `main` **dipreservasi** ke branch baru.
- Tidak ada `git reset/clean/restore`. Tidak ada perubahan `.env`.

### Environment
- `.venv\Scripts\python.exe` = 3.11.0.
- Sebelum audit: `sqlalchemy`, `alembic`, `bcrypt`, `PyJWT`, `psycopg` **belum terpasang** di `.venv`.
  Dilakukan `pip install -r backend/requirements.txt` → sukses.
- Frontend: `node_modules` ada, Vitest berjalan.

### Baseline test sebelum perubahan
| Suite | Command | Hasil |
|---|---|---|
| Backend pytest | `$env:PYTHONPATH="backend"; .venv\Scripts\python -m pytest tests -q` | **11 passed, 1 failed** |
| Frontend Vitest | `cd frontend; npm run test` | **153 passed / 18 files** |

Kegagalan backend tunggal: `test_api_chat_contract` mengharapkan `provider=="mock"`, tetapi `.env`
lokal berisi `LLM_PROVIDER=gemini` sehingga `app.main.agent_core` memakai `GeminiProvider`.
Ini adalah **test isolation gap** (test bergantung pada `.env` developer), bukan bug Gemini.

### Live verification Gemini
- `GET models` → model `gemini-3.5-flash-lite` ada dan mendukung `generateContent`.
- `GeminiProvider.health()` → `ok`, latency ~2.6 s, structured JSON valid.
- Status: **Gemini provider VERIFIED (live)**, model valid.

### Temuan audit (daftar pekerjaan)

**P0 — Blocking**
1. `app/main.py` hanya punya `/health`, `/api/v1/agent/status`, `/api/v1/agent/chat`,
   `/api/v1/workflows/decision`. **Tidak ada** endpoint auth, conversation, dataset,
   business, simulation, monitoring, decision, audit, integration.
2. **Auth service tidak diekspos ke API** — login/refresh/logout/me belum ada route.
3. `AgentCore.process()` tidak memvalidasi context/tenant, tidak memanggil business tools,
   tidak persist ke DB. Hanya prompt → LLM.
4. `IntentRouter` hanya regex, tanpa context follow-up, tanpa metadata audit.
5. `ContextManager` in-memory sebagai sumber utama; `conversations`/`messages` DB tidak dipakai.
6. `ToolDataPort` hanya `Protocol`; **tidak ada implementasi DB-backed**.
7. `_load()` di `tools/business.py` **tidak** menginterseksi `period.outlet_codes` dengan
   `ToolContext.outlet_ids` → **tenant/outlet scope leak** (security bug).
8. `summarize()` di `analytics/metrics.py`: saat cost>revenue, `gross_margin_pct` di-set `0`
   (bug margin negatif). `revenue_sum` duplikasi `total_revenue`.
9. `margin()` menolak `cost > revenue` (`raise`) → tidak bisa merepresentasikan kerugian.
10. `SimulationEngine`: `feasible=True` default sebelum gate; `promo_cost` ambigu
    (dihitung dari `revenue*discount*uplift` bukan subsidy vs baseline); tidak ada validasi
    diskon/uplift/period; tidak ada constraint `data_ready`; sensitivity tidak mencakup uplift.
11. `monitoring/engine.py`: `summarize_baseline` menjumlah semua record (double counting jika
    actual dicatat per periode berulang); tidak ada endpoint/persistensi.
12. `Signal` login: `resolve_principal_for_user` memakai `memberships[0]` → multi-org bug.
13. RBAC source of truth ganda: `ROLE_PERMISSIONS` (hardcoded) dipakai AuthService, sementara
    tabel `role_permissions` diisi seed. Tidak ada validasi konsistensi.
14. `_redact()` hanya menangani `dict` 1 level; tidak menangani `list` → nested secret leak.
15. CSV import hanya validator fungsi; tidak ada upload/endpoint/dataset persistence.
16. GEOAI hanya `MockGeoAIProvider`; tidak ada adapter Overpass nyata.
17. POS integration belum ada sama sekali.
18. Frontend Live Mode: Chat tidak mengirim token, tidak ada refresh session, tidak ada
    conversation persistence; halaman lain fixture-only.
19. `frontend/src/api/client.ts`: error mapping hanya untuk decision endpoint, tidak ada
    generic request helper untuk semua endpoint + auth.
20. Tidak ada user management / role management endpoint.
21. `refresh()` AuthService tidak lock/atomic rotation → race condition two-refresh.
22. Tidak ada seed demo dataset sintetis; pengguna tidak bisa mencoba aplikasi.

**P1 — Penting**
- `app/main.py` `agent_core` dibuat saat import (global singleton) → tidak testable isolasi.
- Error handler FastAPI tidak menyeragamkan format error.
- Tidak ada `RateLimit` / burst protection pada login.
- `AuditRepository.list_for_org` tanpa paginasi/validasi permission di route.
- `models.py`: tidak ada `updated_at` di tabel append-only (benar), tetapi `Index` untuk FK
  `conversation_id` tidak mencakup prefix `conversation_id` sendiri di `messages` (hanya
  composite `conversation_id, created_at` — cukup untuk PostgreSQL sebagai prefix).
- Frontend: `mode-bar` tetap "API nyata · fondasi"; belum mencerminkan status backend.

**P2 — Kualitas**
- Test frontend 153 tetapi tidak mencakup auth/simulation/monitoring live.
- Test backend 12 baris; tidak ada auth/RBAC/tenant/CSV/simulation/GEOAI/POS test.
- Dokumentasi `implementation-status.md` masih menyatakan PostgreSQL "planned" — usang.
- README tidak menyertakan seed, migration, akun dev, troubleshooting.
- Tidak ada skrip start Windows PowerShell.

### Blocker eksternal
- Live Gemini: **tersedia & terverifikasi** (model `gemini-3.5-flash-lite`).
- Overpass API: perlu verifikasi jaringan nyata (fallback: mock + status jujur).
- Vendor POS tertentu: **BLOCKED** (tidak ada credential/dokumentasi vendor).
- PostgreSQL lokal: **BLOCKED** (tidak tersedia di host ini); SQLite dipakai untuk dev/test.

### Pekerjaan berikutnya
Phase 1 → Intent Router, Context Manager DB, AgentCore orchestrator, tool data port DB,
endpoint auth, dan frontend live chat.

### Bug yang ditemukan (tracked)
| ID | Lokasi | Ringkas | Severity |
|---|---|---|---|
| BUG-01 | `analytics/metrics.py:104` | margin negatif di-set 0 | P0 |
| BUG-02 | `analytics/metrics.py:100-103` | cabang lesu tidak konsisten | P0 |
| BUG-03 | `tools/business.py:_load` | outlet scope leak | P0 (security) |
| BUG-04 | `auth/service.py:152` | `memberships[0]` | P0 |
| BUG-05 | `repositories.py:_redact` | list nested tidak di-redact | P1 (security) |
| BUG-06 | `simulation/engine.py` | feasible default True | P0 |
| BUG-07 | `simulation/engine.py` | promo_cost ambiguity | P1 |
| BUG-08 | `monitoring/engine.py` | double counting actual | P0 |
| BUG-09 | `agent/core.py` | LLM tanpa tool/data | P0 |
| BUG-10 | `auth/service.py:refresh` | race rotation | P1 |
| BUG-11 | `metrics.py:supply` | `revenue_sum` duplikat `total_revenue` | P2 |
| BUG-12 | `main.py` | provider global saat import | P1 |

### Completed files (Phase 0)
- `docs/EXECUTION_PROGRESS.md` (baru)
- `.venv` dependency install (tidak ada file repo berubah)
