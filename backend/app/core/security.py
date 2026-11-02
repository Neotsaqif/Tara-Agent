"""Password hashing and JWT token helpers.

Uses the ``bcrypt`` library directly (not passlib, which is broken against
bcrypt >= 4.1). Secrets are always read from environment-backed settings and
are never logged or returned to clients.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from ..config import settings

_BCRYPT_ROUNDS = 12
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    """Return a bcrypt hash. Raises ``ValueError`` on empty input."""
    if not password:
        raise ValueError("password must not be empty")
    encoded = password.encode("utf-8")
    if len(encoded) > _BCRYPT_MAX_BYTES:
        # bcrypt silently truncates at 72 bytes; reject instead of hiding it.
        raise ValueError("password must be at most 72 bytes")
    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time bcrypt verification. Returns False on any error."""
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8")[: _BCRYPT_MAX_BYTES + 1], password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


class JWTError(RuntimeError):
    """Raised when a token is missing, malformed, expired, or of the wrong type."""


ACCESS = "access"
REFRESH = "refresh"


def _jwt_secret() -> str:
    secret = settings.tara_jwt_secret
    if not secret or len(secret) < 16:
        raise JWTError(
            "TARA_JWT_SECRET is not configured (minimum 16 characters)."
        )
    return secret


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def create_access_token(*, user_id: str, org_id: str, roles: list[str], jti: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "org": org_id,
        "roles": roles,
        "type": ACCESS,
        "iat": now,
        "exp": now + timedelta(minutes=settings.tara_jwt_expire_minutes),
        "jti": jti or secrets.token_urlsafe(16),
    }
    return _encode(payload)


def create_refresh_token(*, user_id: str, jti: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": REFRESH,
        "iat": now,
        "exp": now + timedelta(days=settings.tara_refresh_expire_days),
        "jti": jti or secrets.token_urlsafe(16),
    }
    return _encode(payload)


def decode_token(token: str, *, expected_type: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises ``JWTError`` (safe message only)."""
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise JWTError("Token telah kedaluwarsa.") from exc
    except jwt.InvalidTokenError as exc:
        raise JWTError("Token tidak valid.") from exc
    if payload.get("type") != expected_type:
        raise JWTError("Jenis token tidak sesuai.")
    if not payload.get("sub"):
        raise JWTError("Token tidak berisi identitas pengguna.")
    return payload
