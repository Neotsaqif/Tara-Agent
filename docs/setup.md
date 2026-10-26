# Local Setup

## Backend

Prerequisite: Python 3.11+.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:PYTHONPATH="backend"
uvicorn app.main:app --reload --port 8000
```

Health check: `http://localhost:8000/api/v1/health`.

## Frontend

Prerequisite: Node.js 20+ and npm.

```powershell
cd frontend
npm install
npm run dev
```

Vite starts the frontend, normally at `http://localhost:5173`. Set `VITE_API_BASE_URL` in `frontend/.env` when the backend uses another URL. This variable is public configuration and must not contain secrets.

Production build:

```powershell
npm run build
npm run preview
```

## Tests

```powershell
$env:PYTHONPATH="backend"
pytest -q
```

## Data and database status

CSV validation is available as a Python foundation and reports valid/invalid rows. No seed dataset is committed. A PostgreSQL URL is configurable through `DATABASE_URL`, but SQLAlchemy/Alembic persistence is not implemented yet; SQLite remains a local configuration placeholder. Do not treat a configured URL as a successful database connection.

## Troubleshooting

- Backend import errors: activate `.venv` and set `$env:PYTHONPATH="backend"`.
- Frontend cannot reach API: confirm Uvicorn is running on port 8000 and check `VITE_API_BASE_URL`.
- npm dependency errors: use Node.js 20+ and run `npm install` inside `frontend`.
- Missing LLM key: keep `LLM_PROVIDER=mock`; boot and unit tests do not require an external provider.
