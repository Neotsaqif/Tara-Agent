from __future__ import annotations

import time
import urllib.parse

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api import agent as agent_api
from .api import auth as auth_api
from .api import conversations as conversations_api
from .api import data as data_api
from .api import integrations as integrations_api
from .config import settings, validate_runtime_settings
from .db.session import ping_database
from .workflows.state import Decision, WorkflowState, apply_decision

APP_VERSION = "0.3.0"

app = FastAPI(
    title="TARA AGENT API",
    version=APP_VERSION,
    description="Business Reasoning & Value Acceleration Agent — From Business Signals to Executable Decisions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Uniform error envelope (no stack traces leaked) ───────────────────────
@app.exception_handler(StarletteHTTPException)
async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    # Pydantic error list is safe (field names + messages; no secret values).
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    return JSONResponse(
        status_code=422,
        content={"detail": f"Input tidak valid: {first.get('msg', 'unknown')}" + (f" ({field})" if field else "")},
    )


@app.exception_handler(Exception)
async def _unhandled_error(_request: Request, exc: Exception) -> JSONResponse:
    # Deliberately generic: internal stack traces are never returned to clients.
    return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan internal. Silakan coba lagi."})


# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(auth_api.router)
app.include_router(agent_api.router)
app.include_router(conversations_api.router)
app.include_router(data_api.router)
app.include_router(integrations_api.router)


# ── Health & status ───────────────────────────────────────────────────────
@app.get("/health")
@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env, "version": APP_VERSION}


@app.get("/api/v1/system/info")
def system_info() -> dict:
    from .agent.gemini_provider import provider_health

    provider = agent_api._provider()
    health_info = provider_health(provider)
    return {
        "version": APP_VERSION,
        "environment": settings.app_env,
        "database": {"configured": settings.is_postgres, "reachable": ping_database()},
        "provider": {
            "name": getattr(provider, "name", settings.llm_provider),
            "model": getattr(provider, "model", settings.llm_model),
            "health": health_info.level.value,
            "message": health_info.message,
        },
        "geoai_provider": settings.geoai_provider,
        "pos_provider": settings.pos_provider,
    }


# ── Decision sandbox (stateless, backward-compatible) ─────────────────────
class DecisionRequest(BaseModel):
    state: WorkflowState
    decision: Decision
    approved_by: str | None = None
    revision_parameters: dict[str, str] = {}


class DecisionResponse(BaseModel):
    state: WorkflowState
    decision: Decision
    event_id: str
    revision_parameters: dict[str, str]


@app.post("/api/v1/workflows/decision", response_model=DecisionResponse)
def decision(request: DecisionRequest) -> DecisionResponse:
    """Stateless workflow state transition sandbox.

    This endpoint does not authenticate. It exists for UI prototyping only; the
    authoritative approval flow lives in ``/api/v1/decisions/{id}/approvals``.
    """
    try:
        next_state = apply_decision(
            request.state,
            request.decision,
            approved_by=request.approved_by,
            revision_parameters=request.revision_parameters,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return DecisionResponse(
        state=next_state,
        decision=request.decision,
        event_id="local-foundation-event",
        revision_parameters=request.revision_parameters,
    )


@app.on_event("startup")
def _startup() -> None:
    for warning in validate_runtime_settings():
        # Warnings are logged, never containing secret values.
        print(f"[TARA CONFIG WARNING] {warning}")
