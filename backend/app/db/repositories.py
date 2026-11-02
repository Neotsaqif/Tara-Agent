"""Repository layer: thin data-access wrappers over SQLAlchemy models.

Services depend on these repositories, never directly on ORM query objects
outside this module. This keeps context/persistence logic testable and lets the
session lifecycle be controlled by callers.
"""
from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .models import (
    Approval,
    AuditLog,
    Conversation,
    Dataset,
    Decision,
    ImportJob,
    Message,
    MonitoringBaseline,
    MonitoringRecord,
    Organization,
    Outlet,
    OutletAccess,
    Permission,
    Product,
    Role,
    RolePermission,
    SalesTransaction,
    Simulation,
    SimulationScenario,
    User,
    UserOrganization,
    new_id,
)

ALLOWED_ROLES = ("user", "assistant", "system")


# ── Identity ──────────────────────────────────────────────────────────────
class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(func.lower(User.email) == email.lower()))

    def by_id(self, user_id: str) -> User | None:
        return self.db.get(User, user_id)

    def add(self, *, email: str, full_name: str, password_hash: str) -> User:
        user = User(email=email.lower(), full_name=full_name, password_hash=password_hash)
        self.db.add(user)
        self.db.flush()
        return user

    def set_password(self, user: User, password_hash: str) -> None:
        user.password_hash = password_hash
        user.failed_login_count = 0
        user.locked_until = None
        self.db.flush()


class MembershipRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def for_user(self, user_id: str) -> list[UserOrganization]:
        return list(
            self.db.scalars(
                select(UserOrganization)
                .options(selectinload(UserOrganization.role).selectinload(Role.permissions).selectinload(RolePermission.permission))
                .where(UserOrganization.user_id == user_id)
            )
        )

    # Explicit alias used by authentication code; retained separately so the
    # repository API reads naturally at call sites.
    def by_user(self, user_id: str) -> list[UserOrganization]:
        return self.for_user(user_id)

    def add(self, *, user_id: str, organization_id: str, role_id: str | None) -> UserOrganization:
        membership = UserOrganization(user_id=user_id, organization_id=organization_id, role_id=role_id)
        self.db.add(membership)
        self.db.flush()
        return membership

    def outlet_ids(self, user_id: str) -> list[str]:
        return list(self.db.scalars(select(OutletAccess.outlet_id).where(OutletAccess.user_id == user_id)))

    def grant_outlet(self, *, user_id: str, outlet_id: str) -> None:
        exists = self.db.scalar(
            select(OutletAccess).where(OutletAccess.user_id == user_id, OutletAccess.outlet_id == outlet_id)
        )
        if not exists:
            self.db.add(OutletAccess(user_id=user_id, outlet_id=outlet_id))
            self.db.flush()


class RoleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_name(self, name: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.name == name))

    def get_or_create(self, name: str, description: str = "") -> Role:
        role = self.by_name(name)
        if role is None:
            role = Role(name=name, description=description)
            self.db.add(role)
            self.db.flush()
        return role

    def permission_codes(self, role: Role) -> list[str]:
        return [rp.permission.code for rp in role.permissions if rp.permission is not None]

    def grant(self, role: Role, permission_code: str) -> None:
        perm = self.db.scalar(select(Permission).where(Permission.code == permission_code))
        if perm is None:
            perm = Permission(code=permission_code, description=permission_code)
            self.db.add(perm)
            self.db.flush()
        exists = self.db.get(RolePermission, {"role_id": role.id, "permission_id": perm.id})
        if exists is None:
            self.db.add(RolePermission(role_id=role.id, permission_id=perm.id))
            self.db.flush()


class OrganizationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_slug(self, slug: str) -> Organization | None:
        return self.db.scalar(select(Organization).where(Organization.slug == slug))

    def by_id(self, org_id: str) -> Organization | None:
        return self.db.get(Organization, org_id)

    def add(self, *, name: str, slug: str) -> Organization:
        org = Organization(name=name, slug=slug)
        self.db.add(org)
        self.db.flush()
        return org


class OutletRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_org(self, organization_id: str) -> list[Outlet]:
        return list(self.db.scalars(select(Outlet).where(Outlet.organization_id == organization_id).order_by(Outlet.code)))

    def by_id(self, outlet_id: str) -> Outlet | None:
        return self.db.get(Outlet, outlet_id)

    def add(self, *, organization_id: str, code: str, name: str, city: str = "", latitude: float | None = None, longitude: float | None = None) -> Outlet:
        outlet = Outlet(organization_id=organization_id, code=code, name=name, city=city, latitude=latitude, longitude=longitude)
        self.db.add(outlet)
        self.db.flush()
        return outlet


# ── Conversations ─────────────────────────────────────────────────────────
class ConversationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, organization_id: str, user_id: str, title: str, outlet_id: str | None = None) -> Conversation:
        conv = Conversation(organization_id=organization_id, user_id=user_id, title=title[:200], outlet_id=outlet_id)
        self.db.add(conv)
        self.db.flush()
        return conv

    def by_id(self, conversation_id: str) -> Conversation | None:
        return self.db.get(Conversation, conversation_id)

    def list_for_user(self, *, user_id: str, organization_id: str) -> list[Conversation]:
        return list(
            self.db.scalars(
                select(Conversation)
                .where(Conversation.user_id == user_id, Conversation.organization_id == organization_id)
                .order_by(Conversation.updated_at.desc())
            )
        )

    def delete(self, conversation: Conversation) -> None:
        self.db.delete(conversation)
        self.db.flush()

    def set_workflow(self, conversation: Conversation, workflow: str) -> None:
        conversation.workflow = workflow
        self.db.flush()


class MessageRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(
        self,
        *,
        conversation_id: str,
        role: str,
        content: str,
        workflow: str | None = None,
        evidence: list | None = None,
        assumptions: list | None = None,
        limitations: list | None = None,
        routing_meta: dict | None = None,
        provider: str | None = None,
    ) -> Message:
        if role not in ALLOWED_ROLES:
            raise ValueError(f"invalid message role: {role}")
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            workflow=workflow,
            evidence=evidence,
            assumptions=assumptions,
            limitations=limitations,
            routing_meta=routing_meta,
            provider=provider,
        )
        self.db.add(message)
        self.db.flush()
        return message

    def recent(self, conversation_id: str, limit: int = 20) -> list[Message]:
        rows = list(
            self.db.scalars(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc(), Message.id.desc())
                .limit(limit)
            )
        )
        return list(reversed(rows))

    def count(self, conversation_id: str) -> int:
        return self.db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == conversation_id)) or 0


# ── Datasets / sales ──────────────────────────────────────────────────────
class DatasetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, organization_id: str, name: str, source: str, is_synthetic: bool, created_by: str | None) -> Dataset:
        ds = Dataset(organization_id=organization_id, name=name, source=source, is_synthetic=is_synthetic, created_by=created_by)
        self.db.add(ds)
        self.db.flush()
        return ds

    def add_import_job(self, **kwargs) -> ImportJob:
        job = ImportJob(**kwargs)
        self.db.add(job)
        self.db.flush()
        return job

    def list_for_org(self, organization_id: str) -> list[Dataset]:
        return list(self.db.scalars(select(Dataset).where(Dataset.organization_id == organization_id).order_by(Dataset.created_at.desc())))


class SalesRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def exists_external(self, organization_id: str, external_id: str) -> bool:
        return self.db.scalar(
            select(func.count()).select_from(SalesTransaction).where(
                SalesTransaction.organization_id == organization_id,
                SalesTransaction.external_id == external_id,
            )
        ) > 0

    def add_bulk(self, rows: Sequence[dict]) -> int:
        for row in rows:
            self.db.add(SalesTransaction(**row))
        self.db.flush()
        return len(rows)

    def range_query(self, *, organization_id: str, start: datetime, end: datetime, outlet_ids: list[str] | None) -> list[SalesTransaction]:
        stmt = select(SalesTransaction).where(
            SalesTransaction.organization_id == organization_id,
            SalesTransaction.transaction_date >= start,
            SalesTransaction.transaction_date <= end,
        )
        if outlet_ids:
            stmt = stmt.where(SalesTransaction.outlet_id.in_(outlet_ids))
        return list(self.db.scalars(stmt))

    def distinct_products(self, organization_id: str) -> list[str]:
        return list(self.db.scalars(select(Product.name).where(Product.organization_id == organization_id)))


class ProductRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_sku(self, organization_id: str, sku: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.organization_id == organization_id, Product.sku == sku))

    def upsert(self, *, organization_id: str, sku: str, name: str, category: str, unit_price: float, unit_cost: float) -> Product:
        product = self.by_sku(organization_id, sku)
        if product is None:
            product = Product(organization_id=organization_id, sku=sku, name=name, category=category, unit_price=unit_price, unit_cost=unit_cost)
            self.db.add(product)
        else:
            product.name = name
            product.category = category
            product.unit_price = unit_price
            product.unit_cost = unit_cost
        self.db.flush()
        return product

    def list_for_org(self, organization_id: str) -> list[Product]:
        return list(self.db.scalars(select(Product).where(Product.organization_id == organization_id).order_by(Product.name)))


# ── Simulations ───────────────────────────────────────────────────────────
class SimulationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **kwargs) -> Simulation:
        sim = Simulation(**kwargs)
        self.db.add(sim)
        self.db.flush()
        return sim

    def add_scenario(self, **kwargs) -> SimulationScenario:
        scenario = SimulationScenario(**kwargs)
        self.db.add(scenario)
        self.db.flush()
        return scenario

    def by_id(self, simulation_id: str) -> Simulation | None:
        return self.db.get(Simulation, simulation_id)

    def list_for_org(self, organization_id: str) -> list[Simulation]:
        return list(self.db.scalars(select(Simulation).where(Simulation.organization_id == organization_id).order_by(Simulation.created_at.desc())))


# ── Monitoring ────────────────────────────────────────────────────────────
class MonitoringRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_baseline(self, **kwargs) -> MonitoringBaseline:
        baseline = MonitoringBaseline(**kwargs)
        self.db.add(baseline)
        self.db.flush()
        return baseline

    def by_id(self, baseline_id: str) -> MonitoringBaseline | None:
        return self.db.get(MonitoringBaseline, baseline_id)

    def list_for_org(self, organization_id: str) -> list[MonitoringBaseline]:
        return list(self.db.scalars(select(MonitoringBaseline).where(MonitoringBaseline.organization_id == organization_id).order_by(MonitoringBaseline.created_at.desc())))

    def add_record(self, **kwargs) -> MonitoringRecord:
        record = MonitoringRecord(**kwargs)
        self.db.add(record)
        self.db.flush()
        return record

    def records(self, baseline_id: str) -> list[MonitoringRecord]:
        return list(self.db.scalars(select(MonitoringRecord).where(MonitoringRecord.baseline_id == baseline_id).order_by(MonitoringRecord.recorded_at)))


# ── Decisions & approvals ─────────────────────────────────────────────────
class DecisionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, **kwargs) -> Decision:
        decision = Decision(**kwargs)
        self.db.add(decision)
        self.db.flush()
        return decision

    def by_id(self, decision_id: str) -> Decision | None:
        return self.db.get(Decision, decision_id)

    def list_for_org(self, organization_id: str) -> list[Decision]:
        return list(self.db.scalars(select(Decision).where(Decision.organization_id == organization_id).order_by(Decision.created_at.desc())))

    def add_approval(self, **kwargs) -> Approval:
        approval = Approval(**kwargs)
        self.db.add(approval)
        self.db.flush()
        return approval


# ── Audit ─────────────────────────────────────────────────────────────────
class AuditRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log(
        self,
        *,
        action: str,
        resource: str,
        resource_id: str | None = None,
        organization_id: str | None = None,
        actor_id: str | None = None,
        actor_email: str | None = None,
        status: str = "success",
        metadata: dict | None = None,
        decision_ref: str | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            id=new_id(),
            action=action,
            resource=resource,
            resource_id=resource_id,
            organization_id=organization_id,
            actor_id=actor_id,
            actor_email=actor_email,
            status=status,
            metadata_json=_redact(metadata),
            decision_ref=decision_ref,
            ip_address=ip_address,
        )
        self.db.add(entry)
        self.db.flush()
        return entry

    def list_for_org(self, organization_id: str, limit: int = 100) -> list[AuditLog]:
        return list(self.db.scalars(select(AuditLog).where(AuditLog.organization_id == organization_id).order_by(AuditLog.created_at.desc()).limit(limit)))


_SECRET_KEYS = {"password", "password_hash", "api_key", "token", "secret", "authorization", "access_token", "refresh_token"}


def _redact(metadata: dict | list | tuple | None):
    """Recursively strip secret-like keys from dicts and nested sequences."""
    if metadata is None:
        return None
    if isinstance(metadata, dict):
        clean: dict = {}
        for key, value in metadata.items():
            if any(secret in str(key).lower() for secret in _SECRET_KEYS):
                clean[key] = "[REDACTED]"
            else:
                clean[key] = _redact(value) if isinstance(value, (dict, list, tuple)) else value
        return clean
    if isinstance(metadata, (list, tuple)):
        return [_redact(value) if isinstance(value, (dict, list, tuple)) else value for value in metadata]
    return metadata


def utcnow_aware() -> datetime:
    return datetime.now(timezone.utc)
