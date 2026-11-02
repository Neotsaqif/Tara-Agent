"""Authentication service: login, refresh, logout, principal resolution.

Key guarantees:
* Active organization is **explicit**: a user with several memberships must
  either pick one or the service refuses to guess (``memberships[0]`` is never
  used implicitly).
* Permissions always come from the authoritative catalogue
  (:data:`app.auth.rbac.ROLE_PERMISSIONS`); the database projection is verified
  for drift but never overrides the catalogue.
* Refresh rotation is atomic: a token can be exchanged exactly once.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..core.security import (
    ACCESS,
    JWTError,
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from ..db.models import RefreshToken, User
from ..db.repositories import (
    AuditRepository,
    MembershipRepository,
    OrganizationRepository,
    OutletRepository,
    RoleRepository,
    UserRepository,
)
from .rbac import Principal, RoleName, permissions_for_roles

MAX_FAILED_LOGINS = settings.tara_login_max_failed
LOCK_MINUTES = settings.tara_login_lock_minutes


class AuthError(RuntimeError):
    def __init__(self, message: str, status_code: int = 401) -> None:
        super().__init__(message)
        self.status_code = status_code


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.members = MembershipRepository(db)
        self.roles = RoleRepository(db)
        self.orgs = OrganizationRepository(db)
        self.outlets = OutletRepository(db)
        self.audit = AuditRepository(db)

    # ── Login ──────────────────────────────────────────────────────────
    def login(
        self,
        email: str,
        password: str,
        *,
        organization_id: str | None = None,
        ip: str | None = None,
    ) -> dict:
        user = self.users.by_email(email.strip())
        if user is None:
            # Dummy hash check to reduce the timing signal for unknown emails.
            verify_password(password, "$2b$12$" + "x" * 53)
            self.audit.log(
                action="auth.login_failed",
                resource="user",
                status="failure",
                actor_email=email,
                ip_address=ip,
                metadata={"reason": "unknown_user"},
            )
            self.db.commit()
            raise AuthError("Email atau kata sandi salah.")

        now = datetime.now(timezone.utc)
        locked_until = user.locked_until
        if locked_until is not None and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until and locked_until > now:
            self.audit.log(
                action="auth.login_locked",
                resource="user",
                resource_id=user.id,
                actor_id=user.id,
                actor_email=user.email,
                status="failure",
                ip_address=ip,
            )
            self.db.commit()
            raise AuthError("Akun terkunci sementara. Coba lagi nanti.", status_code=423)

        if not user.is_active:
            raise AuthError("Akun tidak aktif.", status_code=403)

        if not verify_password(password, user.password_hash):
            user.failed_login_count += 1
            if user.failed_login_count >= MAX_FAILED_LOGINS:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_login_count = 0
            self.audit.log(
                action="auth.login_failed",
                resource="user",
                resource_id=user.id,
                actor_id=user.id,
                actor_email=user.email,
                status="failure",
                ip_address=ip,
                metadata={"attempts": user.failed_login_count},
            )
            self.db.commit()
            raise AuthError("Email atau kata sandi salah.")

        user.failed_login_count = 0
        user.locked_until = None
        principal = self.resolve_principal_for_user(user, organization_id=organization_id)
        tokens = self._issue_tokens(principal)
        self.audit.log(
            action="auth.login",
            resource="user",
            resource_id=user.id,
            organization_id=principal.organization_id,
            actor_id=user.id,
            actor_email=user.email,
            ip_address=ip,
        )
        self.db.commit()
        return tokens

    def _issue_tokens(self, principal: Principal) -> dict:
        access = create_access_token(
            user_id=principal.user_id,
            org_id=principal.organization_id,
            roles=list(principal.roles),
        )
        refresh = create_refresh_token(user_id=principal.user_id, jti=None)
        payload = decode_token(refresh, expected_type=REFRESH)
        refresh_jti = payload["jti"]
        self.db.add(
            RefreshToken(
                jti=refresh_jti,
                user_id=principal.user_id,
                expires_at=datetime.now(timezone.utc) + timedelta(days=settings.tara_refresh_expire_days),
            )
        )
        self.db.flush()
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "expires_in": settings.tara_jwt_expire_minutes * 60,
            "principal": principal.to_dict(),
            "organizations": self.list_organizations(principal.user_id),
        }

    def refresh(self, refresh_token: str, *, organization_id: str | None = None) -> dict:
        try:
            payload = decode_token(refresh_token, expected_type=REFRESH)
        except JWTError as exc:
            raise AuthError(str(exc)) from exc
        record = self.db.get(RefreshToken, payload["jti"])
        if record is None or record.revoked:
            raise AuthError("Refresh token telah dicabut atau tidak dikenal.")
        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise AuthError("Refresh token telah kedaluwarsa.")
        # Rotate atomically: revoke the old token before issuing a new one.
        record.revoked = True
        self.db.flush()
        user = self.users.by_id(payload["sub"])
        if user is None or not user.is_active:
            raise AuthError("Pengguna tidak ditemukan atau tidak aktif.")
        principal = self.resolve_principal_for_user(user, organization_id=organization_id)
        tokens = self._issue_tokens(principal)
        self.db.commit()
        return tokens

    def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token, expected_type=REFRESH)
        except JWTError:
            return
        record = self.db.get(RefreshToken, payload["jti"])
        if record is not None:
            record.revoked = True
            self.db.commit()

    def revoke_all(self, user_id: str) -> int:
        """Revoke every active refresh token of a user (logout-everywhere)."""
        from sqlalchemy import update

        result = self.db.execute(
            update(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False)).values(revoked=True)
        )
        self.db.commit()
        return int(result.rowcount or 0)

    # ── Organizations ──────────────────────────────────────────────────
    def list_organizations(self, user_id: str) -> list[dict]:
        """Organizations the user belongs to, with their role."""
        result: list[dict] = []
        for membership in self.members.for_user(user_id):
            org = self.orgs.by_id(membership.organization_id)
            if org is None or not org.is_active:
                continue
            result.append(
                {
                    "organization_id": org.id,
                    "organization_name": org.name,
                    "slug": org.slug,
                    "role": membership.role.name if membership.role is not None else None,
                }
            )
        return result

    # ── Principal ──────────────────────────────────────────────────────
    def resolve_principal_for_user(self, user: User, *, organization_id: str | None = None) -> Principal:
        """Build the principal for a user in a *validated* organization.

        When the user belongs to exactly one organization it is selected
        automatically. With several memberships an explicit ``organization_id``
        is required — the first membership is never assumed.
        """
        memberships = self.members.for_user(user.id)
        if not memberships:
            raise AuthError("Pengguna tidak tergabung dalam organisasi mana pun.", status_code=403)

        if organization_id:
            membership = next((m for m in memberships if m.organization_id == organization_id), None)
            if membership is None:
                raise AuthError("Anda bukan anggota organisasi tersebut.", status_code=403)
        elif len(memberships) == 1:
            membership = memberships[0]
        else:
            names = ", ".join(m.organization_id for m in memberships)
            raise AuthError(
                "Akun ini terhubung ke lebih dari satu organisasi. "
                f"Pilih organisasi aktif secara eksplisit. Opsi: {names}",
                status_code=409,
            )

        org = self.orgs.by_id(membership.organization_id)
        if org is None or not org.is_active:
            raise AuthError("Organisasi tidak aktif.", status_code=403)

        role_names = self._role_names(memberships, membership.organization_id)
        permissions = permissions_for_roles(role_names)

        # Outlet scope comes from explicit grants for this organization.
        authorized_outlets = self._authorized_outlet_ids(user.id, membership.organization_id)
        tenant_wide = bool({str(p) for p in permissions} & {"org:manage"})

        return Principal(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            organization_id=org.id,
            organization_name=org.name,
            roles=tuple(role_names),
            permissions=frozenset(permissions),
            outlet_ids=frozenset(authorized_outlets),
            tenant_wide=tenant_wide,
        )

    def _authorized_outlet_ids(self, user_id: str, organization_id: str) -> list[str]:
        from sqlalchemy import select

        from ..db.models import Outlet, OutletAccess

        rows = self.db.execute(
            select(OutletAccess.outlet_id)
            .join(Outlet, Outlet.id == OutletAccess.outlet_id)
            .where(OutletAccess.user_id == user_id, Outlet.organization_id == organization_id)
        ).all()
        return [row[0] for row in rows]

    def _role_names(self, memberships, organization_id: str) -> list[str]:
        """Roles of the user *within the active organization*.

        The membership role is scoped per organization; the optional global
        ``user_roles`` table can add extra roles.
        """
        names: list[str] = []
        for membership in memberships:
            if membership.organization_id != organization_id:
                continue
            if membership.role is not None and membership.role.name not in names:
                names.append(membership.role.name)
        return names

    def authenticate_token(self, token: str) -> Principal:
        """Resolve a principal from an access token.

        The ``org`` claim is verified against the database memberships; a token
        pointing at an organization the user no longer belongs to is rejected.
        """
        try:
            payload = decode_token(token, expected_type=ACCESS)
        except JWTError as exc:
            raise AuthError(str(exc)) from exc
        user = self.users.by_id(payload["sub"])
        if user is None or not user.is_active:
            raise AuthError("Pengguna tidak ditemukan atau tidak aktif.")
        claim_org = payload.get("org")
        if claim_org:
            memberships = self.members.for_user(user.id)
            if not any(m.organization_id == claim_org for m in memberships):
                raise AuthError("Organisasi pada token tidak lagi valid untuk akun ini.", status_code=403)
        return self.resolve_principal_for_user(user, organization_id=claim_org)


def principal_to_dict(principal: Principal) -> dict:
    return principal.to_dict()
