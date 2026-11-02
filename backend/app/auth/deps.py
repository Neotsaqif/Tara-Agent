"""FastAPI dependencies for authentication, RBAC and tenant setup."""
from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..db.session import get_db
from .rbac import PermissionCode, Principal
from .service import AuthError, AuthService


def _token_from_header(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan.")
    return authorization.split(" ", 1)[1].strip()


def get_current_principal(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Principal:
    token = _token_from_header(authorization)
    try:
        principal = AuthService(db).authenticate_token(token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    request.state.principal = principal
    return principal


def get_optional_principal(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Principal | None:
    """Return a principal when a valid bearer token exists, else None.

    Used only by the legacy chat compatibility route. Authenticated routes must
    continue using ``get_current_principal`` and never silently downgrade.
    """
    if not authorization:
        return None
    try:
        principal = AuthService(db).authenticate_token(_token_from_header(authorization))
    except AuthError:
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan.")
    request.state.principal = principal
    return principal


def require_permission(*permissions: PermissionCode) -> Callable:
    """Dependency factory: requires the principal to hold every listed permission."""

    def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        missing = [str(p) for p in permissions if not principal.has(p)]
        if missing:
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak. Izin diperlukan: {', '.join(missing)}.",
            )
        return principal

    return dependency
