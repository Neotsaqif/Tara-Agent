# Implementation Status

| Component | Status | Evidence / limitation |
|---|---|---|
| FastAPI health API | Implemented | `/health` and `/api/v1/health` |
| React/Vite/TypeScript UI | Implemented frontend preview | Figma-based responsive Overview, Chat, Simulation, Monitoring/detail, five Analytics tabs, Memory, Settings; live health and separate stateless decision sandbox |
| Business UI data | Explicit demo only | Isolated Figma fixtures; live business pages show unavailable states. Chat drafts and settings previews are in memory, not server persistence |
| Frontend verification | Implemented | 63 Vitest tests; Playwright Chromium at 375/768/1024/1440 px, axe, dialogs, assets, API failure/retry and local API integration |
| Deterministic revenue/margin | Implemented | `backend/app/analytics/metrics.py` |
| Constraint gate | Implemented | `backend/app/constraints/gate.py` |
| Approve/Reject/Revise transitions | Implemented foundation | Reject=`reexecuting`; Revise=`revision_requested`; persistence not implemented |
| Explicit API errors | Implemented | Approval missing returns 403; invalid workflow transition returns 409 |
| CSV validation/quarantine report | Implemented foundation | Required fields, numeric validation, invalid rows excluded from valid rows |
| Mock LLM provider | Implemented | No external calls or API key required |
| TARA GEOAI boundary | Skeleton | Typed request/result and mock provider; no real geospatial data |
| Context manager/router/coordinator | Skeleton | State interfaces exist; persistent event context not implemented |
| PostgreSQL + SQLAlchemy + Alembic | Planned | Not installed; no persistence migration has been tested |
| Authentication/RBAC/audit persistence | Planned | `approved_by` is not authentication and does not grant permission |
| Simulation/predictive/actual monitoring | Planned | No business model or approved dataset yet |
| POS/Maps/Weather/notifications | Blocked | Contracts, credentials, and permissions unavailable |

Production business data is not included. Frontend demo fixtures are synthetic illustrations transcribed from Figma, never API error fallbacks. `.env` remains local and is not modified by setup changes.

Design reference: https://www.figma.com/design/wK37fT7GIe5zPyRgB8HjPx/Mbah-Darmo?node-id=93-79. Local original SVG assets and Inter font preserve the visual vocabulary. Responsive reflow, permanent demo/API controls, honest integration statuses, and disabled business actions intentionally differ from the static prototype. No pixel-diff baseline or claim of pixel-perfect equivalence. No Firefox/Safari, physical-device, authentication, production API, or deployment verification.
