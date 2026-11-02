"""RBAC catalogue and principal model.

Roles: admin, leader (business owner), analyst (member). Permissions are
granular; roles grant sets of permissions. Frontend-supplied roles are never
trusted — the principal is derived from the JWT and the database membership.

**Single source of truth:** :data:`ROLE_PERMISSIONS` is the authoritative
catalogue. The database ``role_permissions`` table is a *projection* of it,
written by the seed/migration. :func:`resolve_permissions` is the only place
that maps roles to permissions, so the catalogue and the database can never
silently diverge — the divergence check lives in :func:`permission_drift`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class RoleName(StrEnum):
    ADMIN = "admin"
    LEADER = "leader"
    ANALYST = "analyst"


class PermissionCode(StrEnum):
    ORG_MANAGE = "org:manage"
    USER_MANAGE = "user:manage"
    AUDIT_READ = "audit:read"
    CONFIG_MANAGE = "config:manage"
    DATA_READ = "data:read"
    DATA_IMPORT = "data:import"
    ANALYSIS_RUN = "analysis:run"
    SIMULATION_RUN = "simulation:run"
    DECISION_CREATE = "decision:create"
    DECISION_APPROVE = "decision:approve"
    MONITORING_READ = "monitoring:read"
    MONITORING_WRITE = "monitoring:write"
    GEOAI_READ = "geoai:read"
    INTEGRATION_MANAGE = "integration:manage"


ROLE_PERMISSIONS: dict[RoleName, set[PermissionCode]] = {
    RoleName.ADMIN: {
        PermissionCode.ORG_MANAGE,
        PermissionCode.USER_MANAGE,
        PermissionCode.AUDIT_READ,
        PermissionCode.CONFIG_MANAGE,
        PermissionCode.DATA_READ,
        PermissionCode.DATA_IMPORT,
        PermissionCode.ANALYSIS_RUN,
        PermissionCode.SIMULATION_RUN,
        PermissionCode.DECISION_CREATE,
        PermissionCode.DECISION_APPROVE,
        PermissionCode.MONITORING_READ,
        PermissionCode.MONITORING_WRITE,
        PermissionCode.GEOAI_READ,
        PermissionCode.INTEGRATION_MANAGE,
    },
    RoleName.LEADER: {
        PermissionCode.DATA_READ,
        PermissionCode.DATA_IMPORT,
        PermissionCode.ANALYSIS_RUN,
        PermissionCode.SIMULATION_RUN,
        PermissionCode.DECISION_CREATE,
        PermissionCode.DECISION_APPROVE,
        PermissionCode.MONITORING_READ,
        PermissionCode.MONITORING_WRITE,
        PermissionCode.GEOAI_READ,
    },
    RoleName.ANALYST: {
        PermissionCode.DATA_READ,
        PermissionCode.ANALYSIS_RUN,
        PermissionCode.SIMULATION_RUN,
        PermissionCode.MONITORING_READ,
        PermissionCode.GEOAI_READ,
    },
}

# Permission codes that allow the actor to bypass per-outlet scoping.
TENANT_WIDE_PERMISSIONS = {PermissionCode.ORG_MANAGE}


@dataclass(frozen=True)
class Principal:
    user_id: str
    email: str
    full_name: str
    organization_id: str
    organization_name: str
    roles: tuple[str, ...]
    permissions: frozenset[str]
    outlet_ids: frozenset[str] = field(default_factory=frozenset)
    # True when the principal may see every outlet in the organization.
    tenant_wide: bool = False

    def has(self, permission: PermissionCode | str) -> bool:
        return str(permission) in self.permissions

    def can_see_all_outlets(self) -> bool:
        return bool(self.tenant_wide) or bool({str(p) for p in TENANT_WIDE_PERMISSIONS} & self.permissions)

    def allowed_outlet_ids(self) -> list[str] | None:
        """Return None to mean "all outlets" (tenant-wide), else the explicit list."""
        if self.can_see_all_outlets():
            return None
        return sorted(self.outlet_ids)

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "full_name": self.full_name,
            "organization_id": self.organization_id,
            "organization_name": self.organization_name,
            "roles": list(self.roles),
            "permissions": sorted(self.permissions),
            "outlet_ids": sorted(self.outlet_ids),
            "tenant_wide": self.can_see_all_outlets(),
        }


def permissions_for_roles(role_names: list[str]) -> set[str]:
    """Authoritative role → permission mapping."""
    result: set[str] = set()
    for name in role_names:
        try:
            role = RoleName(str(name).strip().lower())
        except ValueError:
            continue
        result.update(str(p) for p in ROLE_PERMISSIONS.get(role, set()))
    return result


def normalize_role_name(name: str) -> str | None:
    try:
        return RoleName(str(name).strip().lower()).value
    except ValueError:
        return None


def permission_drift(db_permissions: dict[str, set[str]]) -> list[str]:
    """Report catalogue/database divergence.

    ``db_permissions`` maps a role name to the permission codes stored in the
    ``role_permissions`` table. Returns a list of human-readable differences;
    an empty list means the projection matches the catalogue.
    """
    drift: list[str] = []
    for role, perms in ROLE_PERMISSIONS.items():
        expected = {str(p) for p in perms}
        actual = {str(p) for p in db_permissions.get(role.value, set())}
        missing = expected - actual
        extra = actual - expected
        if missing:
            drift.append(f"role '{role.value}': permission belum terdaftar di database: {', '.join(sorted(missing))}")
        if extra:
            drift.append(f"role '{role.value}': permission tidak dikenal di katalog: {', '.join(sorted(extra))}")
    return drift
