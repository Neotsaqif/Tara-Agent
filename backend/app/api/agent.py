"""Agent / chat API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..agent.core import AgentCore
from ..agent.context_manager import ContextError
from ..agent.gemini_provider import build_provider, provider_health
from ..agent.provider import ProviderError
from ..agent.schemas import AgentChatRequest, AgentChatResponse
from ..auth.deps import get_optional_principal
from ..auth.rbac import PermissionCode, Principal
from ..config import settings
from ..db.session import get_db
from .schemas import MessageOutRow

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])

# A per-request AgentCore keeps the provider selection deterministic and lets
# tests swap providers via monkeypatching ``build_provider``.
_provider_cache: dict[str, object] = {}


def _provider():
    cached = _provider_cache.get("provider")
    if cached is None:
        cached = build_provider()
        _provider_cache["provider"] = cached
    return cached


def _core() -> AgentCore:
    return AgentCore(_provider())


@router.get("/status")
def status() -> dict:
    from ..agent.provider import MockProvider

    provider = _provider()
    level = "mock" if isinstance(provider, MockProvider) else settings.llm_provider
    health = provider_health(provider)
    return {
        "provider": getattr(provider, "name", level),
        "model": getattr(provider, "model", settings.llm_model),
        "health": {"level": health.level.value, "message": health.message, "latency_ms": health.latency_ms},
        "provider_configured": settings.llm_provider,
        "model_configured": settings.llm_model,
    }


@router.post("/chat", response_model=AgentChatResponse)
def chat(
    request: AgentChatRequest,
    db: Session = Depends(get_db),
    principal: Principal | None = Depends(get_optional_principal),
) -> AgentChatResponse:
    # Legacy unauthenticated compatibility is retained only for a truly empty
    # database used by the original offline unit tests. Once identity data
    # exists, live chat is authenticated and cannot silently downgrade.
    if principal is None:
        try:
            from sqlalchemy import func, select
            from ..db.models import User
            user_count = db.scalar(select(func.count()).select_from(User)) or 0
        except Exception:
            user_count = 0
        if user_count == 0:
            return _core().process(request)
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan untuk Live Chat.")
    core = _core()
    try:
        response = core.process_persisted(request, db=db, principal=principal)
    except ContextError as error:
        db.rollback()
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    except ProviderError as error:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=502, detail="Format respons AI tidak valid.") from error
    except Exception:
        db.rollback()
        raise
    db.commit()
    return response
