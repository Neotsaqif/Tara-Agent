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

Prerequisite: Node.js 20+ and npm. The test runner supports Node.js 20, 22, or 24+; validation used Node.js 24.

```powershell
cd frontend
npm ci
npm run dev
```

Vite starts the frontend at `http://127.0.0.1:5173`. Its development proxy forwards `/api` to `http://127.0.0.1:8000`; no backend CORS change is needed locally. Set `VITE_API_BASE_URL` in `frontend/.env` for a different API origin and configure that origin's CORS separately. This variable is public configuration and must not contain secrets. Production needs an explicitly configured API origin or a reverse proxy; Vite's development proxy is not included in the build.

The initial mode is **API nyata**. Choose **Demo Figma** explicitly to see isolated illustration data. API failures never switch to demo. Chat drafts and settings previews are in-memory only; refreshing or leaving the page loses them. Demo scheduling, stop/cancel, saving and connecting are cancellable local simulations. Mode changes clear their session state. No business approval, campaign execution, login, invitation, or settings persistence is implemented. Deep links include `#chat?context=products`, `#chat/simulation/A?offer=bundle10`, `#analytics/margin`, and `#monitoring/completed`. The decision sandbox in Settings exercises only the existing stateless foundation endpoint.

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

Frontend checks (inside `frontend`):

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
npm audit
```

The end-to-end suite starts Vite on port 5192. Start the backend on port 8000 first: one test intentionally uses the real local health and decision endpoints. Other network mocks are explicit test fixtures, never runtime fallbacks. Browser tests cover 375, 768, 1024, and 1440 px, asset loading, overflow, axe accessibility, dialogs, keyboard/focus, API failure/retry, demo scheduling, timer/mode isolation, history/deep links, Analytics tabs, settings simulation, and exact CSV contents. One inspected Windows Chromium Overview screenshot is committed as a regression baseline; other platforms skip that screenshot only. Review visual differences before running `--update-snapshots`. Chromium only; Firefox, Safari, and physical-device testing have not been performed. Coverage and exceptions: `docs/figma-coverage.md` and `docs/frontend-verification.md`.

## Data and database status

CSV validation is available as a Python foundation and reports valid/invalid rows. No seed dataset is committed. A PostgreSQL URL is configurable through `DATABASE_URL`, but SQLAlchemy/Alembic persistence is not implemented yet; SQLite remains a local configuration placeholder. Do not treat a configured URL as a successful database connection.

## Troubleshooting

- Backend import errors: activate `.venv` and set `$env:PYTHONPATH="backend"`.
- Frontend cannot reach API: confirm Uvicorn is running on port 8000 and check `VITE_API_BASE_URL`.
- npm dependency errors: use Node.js 20+ and run `npm install` inside `frontend`.
- Missing LLM key: keep `LLM_PROVIDER=mock`; boot and unit tests do not require an external provider.
