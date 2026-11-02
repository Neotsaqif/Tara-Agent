"""Auth API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth.deps import get_current_principal
from ..auth.rbac import Principal
from ..auth.service import AuthError, AuthService
from ..db.session import get_db
from .schemas import LoginIn, LogoutIn, MeOut, RefreshIn, TokenBundle

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/login", response_model=TokenBundle)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenBundle:
    try:
        bundle = AuthService(db).login(
            payload.email,
            payload.password,
            organization_id=payload.organization_id,
            ip=_client_ip(request),
        )
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return TokenBundle(**bundle)


@router.post("/refresh", response_model=TokenBundle)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenBundle:
    try:
        bundle = AuthService(db).refresh(payload.refresh_token, organization_id=payload.organization_id)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return TokenBundle(**bundle)


@router.post("/logout")
def logout(payload: LogoutIn, db: Session = Depends(get_db)) -> dict:
    AuthService(db).logout(payload.refresh_token)
    return {"status": "ok"}


@router.get("/me", response_model=MeOut)
def me(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)) -> MeOut:
    from ..auth.service import AuthService

    organizations = AuthService(db).list_organizations(principal.user_id)
    return MeOut(principal=principal.to_dict(), organizations=organizations)


@router.post("/logout-all")
def logout_all(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)) -> dict:
    count = AuthService(db).revoke_all(principal.user_id)
    return {"status": "ok", "revoked": count}
