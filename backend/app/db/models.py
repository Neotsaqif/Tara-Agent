"""SQLAlchemy ORM models for TARA AGENT.

All persistent state lives here: identity/RBAC, organization/outlet topology,
datasets/imports, sales transactions and products, simulations/scenarios,
monitoring baselines/records, decisions/approvals, audit logs, integrations and
GEOAI cache. Every table has created/updated timestamps except append-only
event/log tables, which only need ``created_at``.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


# ── Identity & RBAC ───────────────────────────────────────────────────────
class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    outlets: Mapped[list["Outlet"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    memberships: Mapped[list["UserOrganization"]] = relationship(back_populates="organization", cascade="all, delete-orphan")


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    memberships: Mapped[list["UserOrganization"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Role(Base, TimestampMixin):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), default="", nullable=False)

    permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role", cascade="all, delete-orphan")
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="role", cascade="all, delete-orphan")


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), default="", nullable=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id: Mapped[str] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[str] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)

    role: Mapped[Role] = relationship(back_populates="permissions")
    permission: Mapped[Permission] = relationship()


class UserOrganization(Base, TimestampMixin):
    """Membership joins a user to an organization; scope comes from ``OutletAccess``."""
    __tablename__ = "user_organizations"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", name="uq_user_org"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    # Role assignment is scoped to the organization.
    role_id: Mapped[str | None] = mapped_column(ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)

    user: Mapped[User] = relationship(back_populates="memberships")
    organization: Mapped[Organization] = relationship(back_populates="memberships")
    role: Mapped[Role | None] = relationship()


class UserRole(Base):
    """Optional explicit multi-role assignment for a user inside an org (covers multi-role)."""
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[str] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

    role: Mapped[Role] = relationship(back_populates="user_roles")


class OutletAccess(Base):
    """Explicit per-user, per-outlet access grant inside one organization."""
    __tablename__ = "outlet_access"
    __table_args__ = (
        UniqueConstraint("user_id", "outlet_id", name="uq_user_outlet_access"),
        Index("ix_outlet_access_user", "user_id"),
    )
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    outlet_id: Mapped[str] = mapped_column(ForeignKey("outlets.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── Outlets ───────────────────────────────────────────────────────────────
class Outlet(Base, TimestampMixin):
    __tablename__ = "outlets"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_outlet_org_code"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization: Mapped[Organization] = relationship(back_populates="outlets")


# ── Conversations ─────────────────────────────────────────────────────────
class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"
    __table_args__ = (Index("ix_conversation_org_user", "organization_id", "user_id"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), default="Percakapan baru", nullable=False)
    workflow: Mapped[str | None] = mapped_column(String(40), nullable=True)
    outlet_id: Mapped[str | None] = mapped_column(ForeignKey("outlets.id", ondelete="SET NULL"), nullable=True)

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_message_conversation_created", "conversation_id", "created_at"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    workflow: Mapped[str | None] = mapped_column(String(40), nullable=True)
    evidence: Mapped[list | None] = mapped_column(JSON, nullable=True)
    assumptions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    limitations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    routing_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


# ── Datasets & imports ────────────────────────────────────────────────────
class Dataset(Base, TimestampMixin):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="csv", nullable=False)  # csv | pos | demo
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class ImportJob(Base, TimestampMixin):
    __tablename__ = "import_jobs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id: Mapped[str | None] = mapped_column(ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending|running|succeeded|failed|partial
    source: Mapped[str] = mapped_column(String(40), default="csv", nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("organization_id", "sku", name="uq_product_org_sku"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SalesTransaction(Base):
    __tablename__ = "sales_transactions"
    __table_args__ = (
        UniqueConstraint("organization_id", "external_id", name="uq_sales_org_external"),
        Index("ix_sales_org_date", "organization_id", "transaction_date"),
        Index("ix_sales_outlet_date", "outlet_id", "transaction_date"),
    )
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    outlet_id: Mapped[str] = mapped_column(ForeignKey("outlets.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    dataset_id: Mapped[str | None] = mapped_column(ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    external_id: Mapped[str] = mapped_column(String(120), nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    revenue: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    gross_profit: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


# ── Simulation ────────────────────────────────────────────────────────────
class Simulation(Base, TimestampMixin):
    __tablename__ = "simulations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), default="Simulasi promo", nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), nullable=False)
    input_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    scenarios: Mapped[list["SimulationScenario"]] = relationship(
        back_populates="simulation", cascade="all, delete-orphan"
    )


class SimulationScenario(Base, TimestampMixin):
    __tablename__ = "simulation_scenarios"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    simulation_id: Mapped[str] = mapped_column(ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False)
    outputs: Mapped[dict] = mapped_column(JSON, nullable=False)
    feasible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    constraint_reasons: Mapped[list | None] = mapped_column(JSON, nullable=True)

    simulation: Mapped[Simulation] = relationship(back_populates="scenarios")


# ── Monitoring ────────────────────────────────────────────────────────────
class MonitoringBaseline(Base, TimestampMixin):
    __tablename__ = "monitoring_baselines"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    simulation_id: Mapped[str | None] = mapped_column(ForeignKey("simulations.id", ondelete="SET NULL"), nullable=True)
    outlet_id: Mapped[str | None] = mapped_column(ForeignKey("outlets.id", ondelete="SET NULL"), nullable=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    metric: Mapped[str] = mapped_column(String(60), default="revenue", nullable=False)
    predicted_value: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    threshold_warning_pct: Mapped[float] = mapped_column(Numeric(6, 2), default=10, nullable=False)
    threshold_critical_pct: Mapped[float] = mapped_column(Numeric(6, 2), default=20, nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), nullable=False)

    records: Mapped[list["MonitoringRecord"]] = relationship(back_populates="baseline", cascade="all, delete-orphan")


class MonitoringRecord(Base):
    __tablename__ = "monitoring_records"
    __table_args__ = (Index("ix_monitoring_record_baseline", "baseline_id", "recorded_at"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    baseline_id: Mapped[str] = mapped_column(ForeignKey("monitoring_baselines.id", ondelete="CASCADE"), nullable=False)
    actual_value: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    variance: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    variance_pct: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # on_track|warning|critical
    note: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    recorded_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    baseline: Mapped[MonitoringBaseline] = relationship(back_populates="records")


# ── Decisions & approvals ─────────────────────────────────────────────────
class Decision(Base, TimestampMixin):
    __tablename__ = "decisions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    simulation_id: Mapped[str | None] = mapped_column(ForeignKey("simulations.id", ondelete="SET NULL"), nullable=True)
    scenario_id: Mapped[str | None] = mapped_column(ForeignKey("simulation_scenarios.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    decision_type: Mapped[str] = mapped_column(String(60), default="promo", nullable=False)
    state: Mapped[str] = mapped_column(String(40), default="pending_approval", nullable=False, index=True)
    impact_level: Mapped[str] = mapped_column(String(20), default="high", nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    approvals: Mapped[list["Approval"]] = relationship(back_populates="decision", cascade="all, delete-orphan")


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    decision_id: Mapped[str] = mapped_column(ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    # ``decision_action`` holds approve/reject/revise. The name avoids clashing
    # with the ``decision`` relationship used by ``back_populates``.
    decision_action: Mapped[str] = mapped_column("decision", String(20), nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    revision_parameters: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    constraints: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    resulting_state: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    decision: Mapped["Decision"] = relationship(back_populates="approvals")


# ── Audit & integrations ──────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_org_created", "organization_id", "created_at"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    actor_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="success", nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    decision_ref: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class Integration(Base, TimestampMixin):
    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("organization_id", "kind", "provider", name="uq_integration"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)  # pos | geoai
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending_credentials", nullable=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GeoAICache(Base):
    __tablename__ = "geoai_cache"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_user", "user_id"),)
    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
