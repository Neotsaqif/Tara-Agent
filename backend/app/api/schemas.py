"""Shared Pydantic API request/response schemas.

These schemas are the public API contract; the frontend mirrors them via
TypeScript types in ``src/api/client.ts``.
"""
from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, use_enum_values=True)


class ApiError(CamelModel):
    detail: str
    code: str | None = None


class MessageOut(BaseModel):
    message: str
    code: str | None = None


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


# ── Auth ──────────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    organization_id: str | None = Field(default=None, max_length=64)


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4096)
    organization_id: str | None = Field(default=None, max_length=64)


class LogoutIn(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4096)


class TokenBundle(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    principal: dict
    organizations: list[dict] = Field(default_factory=list)


class MeOut(BaseModel):
    principal: dict
    organizations: list[dict] = Field(default_factory=list)


# ── Conversation ──────────────────────────────────────────────────────────
class ConversationOut(BaseModel):
    id: str
    title: str
    workflow: str | None = None
    outlet_id: str | None = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class MessageOutRow(BaseModel):
    id: str
    role: str
    content: str
    workflow: str | None = None
    evidence: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    provider: str | None = None
    created_at: datetime


class ConversationDetail(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOutRow]


# ── Datasets / import ─────────────────────────────────────────────────────
class DatasetOut(BaseModel):
    id: str
    name: str
    source: str
    is_synthetic: bool
    row_count: int
    created_at: datetime


class ImportResultOut(BaseModel):
    dataset_id: str
    import_job_id: str
    status: str
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    errors: list[str] = Field(default_factory=list)


# ── Business tools ────────────────────────────────────────────────────────
class ToolRunIn(BaseModel):
    tool: str = Field(min_length=1, max_length=80)
    payload: dict = Field(default_factory=dict)


class ToolRunOut(BaseModel):
    tool: str
    result: dict
    status: str = "ok"


# ── Simulation ────────────────────────────────────────────────────────────
class ScenarioIn(BaseModel):
    label: str = Field(default="", max_length=80)
    discount_pct: float = Field(ge=0, le=100)
    volume_uplift_pct: float = Field(default=0, ge=0, le=500)
    period_days: int = Field(default=7, ge=1, le=366)


class SimulationIn(BaseModel):
    title: str = Field(default="Simulasi promo", max_length=200)
    outlet_codes: list[str] = Field(default_factory=list)
    start: datetime | None = None
    end: datetime | None = None
    scenarios: list[ScenarioIn] = Field(min_length=1, max_length=10)


class SimulationOut(BaseModel):
    id: str
    title: str
    model_version: str
    created_at: datetime
    computed_at: datetime
    input_payload: dict
    scenarios: list[dict]
    baseline: dict
    sensitivity: list[dict]
    assumptions: list[str]
    limitations: list[str]
    formulas: dict
    constraints: dict


# ── Monitoring ────────────────────────────────────────────────────────────
class MonitoringBaselineIn(BaseModel):
    label: str = Field(max_length=200)
    metric: str = Field(default="revenue", max_length=60)
    predicted_value: float = Field(gt=0)
    period_start: datetime
    period_end: datetime
    threshold_warning_pct: float = Field(default=10, ge=0, le=100)
    threshold_critical_pct: float = Field(default=20, ge=0, le=100)
    simulation_id: str | None = None
    outlet_id: str | None = None


class MonitoringBaselineOut(BaseModel):
    id: str
    label: str
    metric: str
    predicted_value: float
    threshold_warning_pct: float
    threshold_critical_pct: float
    period_start: datetime
    period_end: datetime
    model_version: str
    simulation_id: str | None = None
    outlet_id: str | None = None
    created_at: datetime
    latest: dict | None = None


class MonitoringRecordIn(BaseModel):
    actual_value: float
    note: str = Field(default="", max_length=500)
    cumulative: bool = False


class MonitoringRecordOut(BaseModel):
    id: str
    actual_value: float
    variance: float
    variance_pct: float
    status: str
    note: str
    recorded_at: datetime


# ── Decisions ─────────────────────────────────────────────────────────────
class DecisionIn(BaseModel):
    title: str = Field(max_length=200)
    decision_type: str = Field(default="promo", max_length=60)
    simulation_id: str | None = None
    scenario_id: str | None = None
    impact_level: str = Field(default="high", max_length=20)
    payload: dict | None = None


class DecisionOut(BaseModel):
    id: str
    title: str
    decision_type: str
    state: str
    impact_level: str
    simulation_id: str | None = None
    created_by: str
    created_at: datetime
    payload: dict | None = None
    approvals: list[dict] = Field(default_factory=list)


class ApprovalIn(BaseModel):
    decision: str = Field(pattern="^(approve|reject|revise)$")
    reason: str = Field(default="", max_length=1000)
    revision_parameters: dict | None = None


# ── Audit ─────────────────────────────────────────────────────────────────
class AuditOut(BaseModel):
    id: str
    action: str
    resource: str
    resource_id: str | None = None
    status: str
    actor_email: str | None = None
    created_at: datetime
    metadata_json: dict | None = None


# ── Integrations ──────────────────────────────────────────────────────────
class IntegrationOut(BaseModel):
    id: str | None = None
    kind: str
    provider: str
    status: str
    last_synced_at: datetime | None = None


class GeoAIQueryIn(BaseModel):
    outlet_id: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    radius_m: float = Field(default=1500, gt=0, le=10000)
    question: str = Field(default="", max_length=500)
