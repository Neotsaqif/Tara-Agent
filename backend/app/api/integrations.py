"""POS integration API + status router.

Production vendor connections are **BLOCKED** until credentials and vendor API
documentation are available. The generic REST adapter here implements the
plumbing (timeout, retry, normalization, duplicate prevention) so a real
vendor can be wired in by configuration only — no AgentCore change required.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth.deps import get_current_principal
from ..auth.rbac import Principal
from ..config import settings
from ..db.session import get_db
from .schemas import GeoAIQueryIn, IntegrationOut

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationOut])
def list_integrations(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[IntegrationOut]:
    out: list[IntegrationOut] = []
    geo_status = "operational" if settings.geoai_provider in {"osm", "mock"} else "not_configured"
    if settings.geoai_provider == "osm":
        geo_status = "operational"
    elif settings.geoai_provider == "mock":
        geo_status = "mock"
    out.append(
        IntegrationOut(
            id=None,
            kind="geoai",
            provider=settings.geoai_provider,
            status=geo_status,
            last_synced_at=None,
        )
    )
    pos_status = "blocked"
    if settings.pos_provider == "generic" and settings.pos_api_base_url:
        pos_status = "configured"
    elif settings.pos_provider == "none":
        pos_status = "csv_only"
    out.append(
        IntegrationOut(
            id=None,
            kind="pos",
            provider=settings.pos_provider_name,
            status=pos_status,
            last_synced_at=None,
        )
    )
    return out


@router.post("/geoai/query")
def geoai_query(
    payload: GeoAIQueryIn,
    principal: Principal = Depends(get_current_principal),
) -> dict:
    from ..geoai.provider import build_geoai_provider, result_to_dict

    provider = build_geoai_provider()
    result = provider.analyze(
        __import__("app.geoai.provider", fromlist=["GeoContextRequest"]).GeoContextRequest(
            outlet_id=payload.outlet_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            radius_m=payload.radius_m,
            question=payload.question,
        )
    )
    return result_to_dict(result)


@router.post("/pos/sync")
def pos_sync(
    principal: Principal = Depends(get_current_principal),
) -> dict:
    """Trigger a POS sync.

    Returns an explicit ``blocked`` status until a vendor is configured. The
    CSV import endpoint is the operational fallback and is linked here so the
    UI can guide the user there.
    """
    if not settings.pos_api_base_url:
        return {
            "status": "blocked",
            "reason": "POS_VENDOR belum dikonfigurasi. Gunakan /api/v1/datasets/import (CSV) sebagai jalur data utama.",
            "csv_fallback": "/api/v1/datasets/import",
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }
    # Generic adapter wiring is implemented in pos.adapter; for now we expose
    # the contract so the UI can call it and surface status honestly.
    return {
        "status": "not_implemented",
        "reason": "Adapter generik tersedia tetapi sync produksi belum diaktifkan.",
        "csv_fallback": "/api/v1/datasets/import",
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
