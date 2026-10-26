# Local Setup

Prerequisite: Python 3.11+.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:PYTHONPATH="backend"
uvicorn app.main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`.

Frontend in another terminal:

```powershell
python -m http.server 3000 --directory frontend
```

Run tests:

```powershell
pytest
```

Copy `.env.example` to `.env` only when local overrides are needed. No migration or seed command exists yet; the current default is stateless SQLite configuration and synthetic data is not yet bundled.

Troubleshooting: activate the virtual environment, reinstall requirements, and set `PYTHONPATH=backend` before running tests or Uvicorn.
