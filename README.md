# TARA AGENT

**Business Reasoning & Value Acceleration Agent** — *From Business Signals to Executable Decisions.*

Fondasi MVP untuk F&B multi-outlet. Repository saat ini menyediakan FastAPI health API, frontend lokal minimal, deterministic analytics, constraint gate, workflow decision state, mock LLM provider, test unit, dan dokumentasi arsitektur.

## Quick start

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:PYTHONPATH="backend"
uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
python -m http.server 3000 --directory frontend
```

Tests:

```powershell
pytest
```

Salin `.env.example` ke `.env` bila perlu. Default `LLM_PROVIDER=mock`; API key eksternal tidak dibutuhkan.

## Dokumentasi
- [Architecture](docs/architecture.md)
- [Setup](docs/setup.md)
- [Implementation status](docs/implementation-status.md)
- Source project documents: `.tara-agents/`

## Status dan batasan
Informational, Diagnostic, dan Goal-Directed dipertahankan sebagai target workflow. Fondasi state Approve/Reject/Revise dan hard constraint tersedia, tetapi persistence event/case, auth/RBAC, database migration, ingestion CSV, simulation, monitoring, audit persistence, POS, GeoAI, dan external LLM masih skeleton/planned/blocked. Tidak ada auto-publishing campaign.
