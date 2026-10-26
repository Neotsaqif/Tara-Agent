# TARA AGENT

**Business Reasoning & Value Acceleration Agent** — *From Business Signals to Executable Decisions.*

Fondasi MVP untuk F&B multi-outlet. Repository saat ini menyediakan React/Vite/TypeScript UI, FastAPI API, AI Core v1 dengan mock/Gemini provider, deterministic analytics, constraint gate, workflow decision state, CSV validation foundation, GeoAI interface, test unit, dan dokumentasi arsitektur.

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
cd frontend
npm install
npm run dev
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
- [AI Core v1](docs/ai-core-v1.md)
- Source project documents: `.tara-agents/`

## Status dan batasan
Informational, Diagnostic, dan Goal-Directed dipertahankan sebagai target workflow. Fondasi state Approve/Reject/Revise, hard constraint, CSV validation, dan GeoAI interface tersedia. Persistence event/case, auth/RBAC, database migration, simulation, monitoring, audit persistence, POS, GeoAI provider nyata, dan external LLM masih skeleton/planned/blocked. Tidak ada auto-publishing campaign.
