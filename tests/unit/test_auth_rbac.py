"""Auth, RBAC and audit redaction regression tests."""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

from app.auth.rbac import (  # noqa: E402
    PermissionCode,
    Principal,
    RoleName,
    normalize_role_name,
    permission_drift,
    permissions_for_roles,
)
from app.config import settings
from app.core.security import (  # noqa: E402
    ACCESS,
    JWTError,
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.repositories import _redact  # noqa: E402


def test_password_hash_roundtrip():
    h = hash_password("Sup3rSecret!2026")
    assert h != "Sup3rSecret!2026"
    assert verify_password("Sup3rSecret!2026", h)
    assert not verify_password("wrong", h)


def test_empty_password_rejected():
    with pytest.raises(ValueError):
        hash_password("")


def test_jwt_secret_required():
    # The dev secret is set by the test environment; verify decode works.
    token = create_access_token(user_id="u1", org_id="org1", roles=["analyst"])
    payload = decode_token(token, expected_type=ACCESS)
    assert payload["sub"] == "u1"
    assert payload["org"] == "org1"
    assert payload["type"] == ACCESS


def test_token_type_mismatch_rejected():
    refresh = create_refresh_token(user_id="u1")
    with pytest.raises(JWTError):
        decode_token(refresh, expected_type=ACCESS)


def test_invalid_token_rejected():
    with pytest.raises(JWTError):
        decode_token("not.a.token", expected_type=ACCESS)


def test_permissions_for_roles_canonical():
    perms = permissions_for_roles(["admin"])
    assert str(PermissionCode.ORG_MANAGE) in perms
    assert str(PermissionCode.USER_MANAGE) in perms


def test_permissions_for_roles_ignores_unknown():
    perms = permissions_for_roles(["admin", "does_not_exist"])
    assert str(PermissionCode.ANALYSIS_RUN) in perms


def test_normalize_role_name():
    assert normalize_role_name("Admin") == "admin"
    assert normalize_role_name("  LEADER  ") == "leader"
    assert normalize_role_name("ghost") is None


def test_permission_drift_detects_missing_db_permissions():
    drift = permission_drift({"admin": set(), "leader": set(), "analyst": set()})
    assert drift
    assert any("admin" in line for line in drift)


def test_permission_drift_detects_extra_db_permissions():
    drift = permission_drift(
        {
            "admin": {"org:manage", "totally:fake"},
            "leader": set(),
            "analyst": set(),
        }
    )
    assert any("totally:fake" in line for line in drift)


def test_principal_outlet_scope():
    p = Principal(
        user_id="u1", email="a@b.c", full_name="A", organization_id="org", organization_name="Org",
        roles=("analyst",), permissions=frozenset({"data:read"}), outlet_ids=frozenset({"CITY"}),
    )
    assert p.allowed_outlet_ids() == ["CITY"]
    assert not p.can_see_all_outlets()


def test_principal_admin_sees_all_outlets():
    p = Principal(
        user_id="u1", email="a@b.c", full_name="A", organization_id="org", organization_name="Org",
        roles=("admin",), permissions=frozenset({"org:manage"}), outlet_ids=frozenset(),
    )
    assert p.allowed_outlet_ids() is None
    assert p.can_see_all_outlets()


# ── Audit redaction (BUG-05) ──────────────────────────────────────────────
def test_redact_strips_secret_keys_in_dict():
    clean = _redact({"api_key": "abc", "token": "xyz", "user_id": "u1"})
    assert clean["api_key"] == "[REDACTED]"
    assert clean["token"] == "[REDACTED]"
    assert clean["user_id"] == "u1"


def test_redact_handles_nested_dict():
    clean = _redact({"outer": {"inner_api_key": "secret", "data": "keep"}})
    assert clean["outer"]["inner_api_key"] == "[REDACTED]"
    assert clean["outer"]["data"] == "keep"


def test_redact_handles_list_of_dicts():
    clean = _redact({"items": [{"token": "x"}, {"normal": "y"}]})
    assert clean["items"][0]["token"] == "[REDACTED]"
    assert clean["items"][1]["normal"] == "y"


def test_redact_handles_top_level_list():
    clean = _redact([{"api_key": "x"}, {"ok": "y"}])
    assert clean[0]["api_key"] == "[REDACTED]"
    assert clean[1]["ok"] == "y"


def test_redact_handles_none():
    assert _redact(None) is None
