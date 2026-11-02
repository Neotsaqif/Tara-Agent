"""Dataset + CSV import + business tool + simulation/monitoring/decision/audit API.

This router is intentionally split by feature area but kept in one module for
the MVP so the route table stays easy to audit. Each handler enforces tenant
and outlet scoping via the principal and the repository layer.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth.deps import get_current_principal, require_permission
from ..auth.rbac import PermissionCode, Principal
from ..config import settings
from ..constraints.gate import BusinessConstraints
from ..db.models import (
    Approval,
    AuditLog,
    Dataset,
    Decision,
    ImportJob,
    Outlet,
    Product,
    SalesTransaction,
    Simulation,
    SimulationScenario,
)
from ..db.repositories import (
    AuditRepository,
    DatasetRepository,
    DecisionRepository,
    MonitoringRepository,
    OrganizationRepository,
    OutletRepository,
    ProductRepository,
    SalesRepository,
    SimulationRepository,
)
from ..db.session import get_db
from ..monitoring import engine as monitoring_engine
from ..simulation import engine as simulation_engine
from ..tools.business import (
    ToolError,
    ToolForbidden,
    ToolRegistry,
    default_tools,
    effective_outlets,
)
from ..tools.data_port import DatabaseToolDataPort, json_safe


def _as_dict_safely(obj) -> dict:
    return json_safe(obj.__dict__)

from .schemas import (
    ApprovalIn,
    AuditOut,
    DecisionIn,
    DecisionOut,
    DatasetOut,
    GeoAIQueryIn,
    ImportResultOut,
    MonitoringBaselineIn,
    MonitoringBaselineOut,
    MonitoringRecordIn,
    MonitoringRecordOut,
    SimulationIn,
    SimulationOut,
    ToolRunIn,
    ToolRunOut,
)

router = APIRouter(prefix="/api/v1", tags=["data"])


def _constraints() -> BusinessConstraints:
    return BusinessConstraints()


def _tool_registry() -> ToolRegistry:
    return ToolRegistry(default_tools())


def _audit(db: Session, principal: Principal, *, action: str, resource: str, resource_id: str | None = None, metadata: dict | None = None, status: str = "success") -> None:
    AuditRepository(db).log(
        action=action,
        resource=resource,
        resource_id=resource_id,
        organization_id=principal.organization_id,
        actor_id=principal.user_id,
        actor_email=principal.email,
        status=status,
        metadata=metadata,
    )


# ── Datasets ──────────────────────────────────────────────────────────────
@router.get("/datasets", response_model=list[DatasetOut])
def list_datasets(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[DatasetOut]:
    rows = DatasetRepository(db).list_for_org(principal.organization_id)
    return [
        DatasetOut(
            id=d.id,
            name=d.name,
            source=d.source,
            is_synthetic=d.is_synthetic,
            row_count=d.row_count,
            created_at=d.created_at,
        )
        for d in rows
    ]


_CSV_FIELDS = (
    "outlet_code",
    "sku",
    "product_name",
    "category",
    "transaction_date",
    "quantity",
    "unit_price",
    "unit_cost",
    "discount_amount",
    "external_id",
)


def _parse_csv(raw: bytes) -> tuple[list[dict], list[dict], list[str]]:
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    fields = set(reader.fieldnames or [])
    missing = {f for f in _CSV_FIELDS if f not in fields}
    if missing:
        raise ValueError(f"Kolom CSV wajib hilang: {', '.join(sorted(missing))}")
    valid: list[dict] = []
    invalid: list[dict] = []
    errors: list[str] = []
    for index, row in enumerate(reader, start=2):
        try:
            qty = int(row["quantity"])
            price = Decimal(str(row["unit_price"]))
            cost = Decimal(str(row["unit_cost"]))
            discount = Decimal(str(row.get("discount_amount") or 0))
            if qty <= 0:
                raise ValueError("quantity harus > 0")
            if price < 0 or cost < 0 or discount < 0:
                raise ValueError("nilai negatif tidak diizinkan")
            dt = datetime.fromisoformat(row["transaction_date"])
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            row["quantity"] = qty
            row["unit_price"] = price
            row["unit_cost"] = cost
            row["discount_amount"] = discount
            row["transaction_date"] = dt
            valid.append(row)
        except (ValueError, InvalidOperation, KeyError, TypeError) as exc:
            invalid.append(dict(row))
            errors.append(f"Baris {index}: {exc}")
    return valid, invalid, errors


@router.post("/datasets/import", response_model=ImportResultOut)
def import_csv(
    file: UploadFile = File(...),
    principal: Principal = Depends(require_permission(PermissionCode.DATA_IMPORT)),
    db: Session = Depends(get_db),
) -> ImportResultOut:
    raw = file.file.read()
    if len(raw) > settings.tara_csv_max_bytes:
        raise HTTPException(413, "Berkas CSV melebihi batas ukuran.")
    try:
        valid, invalid, errors = _parse_csv(raw)
    except ValueError as exc:
        _audit(db, principal, action="dataset.import_failed", resource="dataset", status="failure", metadata={"reason": str(exc)})
        db.commit()
        raise HTTPException(422, str(exc)) from exc

    org_id = principal.organization_id
    outlets = {o.code: o for o in OutletRepository(db).list_for_org(org_id)}
    products = ProductRepository(db)

    # Resolve outlets for the caller's scope once.
    authorized = principal.allowed_outlet_ids()

    dataset = DatasetRepository(db).create(
        organization_id=org_id,
        name=(file.filename or "import.csv")[:200],
        source="csv",
        is_synthetic=False,
        created_by=principal.user_id,
    )
    job = DatasetRepository(db).add_import_job(
        organization_id=org_id,
        dataset_id=dataset.id,
        status="running",
        source="csv",
        valid_rows=0,
        invalid_rows=0,
        duplicate_rows=0,
        created_by=principal.user_id,
    )

    sales = SalesRepository(db)
    inserted = 0
    duplicates = 0
    for row in valid:
        outlet = outlets.get(row["outlet_code"])
        if outlet is None:
            invalid.append({"external_id": row.get("external_id", "?"), "reason": "outlet_code tidak dikenal"})
            errors.append(f"Baris external_id={row.get('external_id', '?')}: outlet_code tidak dikenal")
            continue
        if authorized is not None and outlet.id not in authorized:
            errors.append(f"Baris external_id={row.get('external_id', '?')}: outlet di luar wewenang Anda")
            invalid.append({"external_id": row.get("external_id", "?"), "reason": "unauthorized outlet"})
            continue
        if sales.exists_external(org_id, row["external_id"]):
            duplicates += 1
            continue
        product = products.upsert(
            organization_id=org_id,
            sku=row["sku"],
            name=row["product_name"],
            category=row.get("category", ""),
            unit_price=float(row["unit_price"]),
            unit_cost=float(row["unit_cost"]),
        )
        qty = int(row["quantity"])
        line_gross = Decimal(qty) * Decimal(str(row["unit_price"]))
        line_rev = line_gross - Decimal(str(row["discount_amount"]))
        line_cost = Decimal(qty) * Decimal(str(row["unit_cost"]))
        sales.add_bulk(
            [
                {
                    "organization_id": org_id,
                    "outlet_id": outlet.id,
                    "product_id": product.id,
                    "dataset_id": dataset.id,
                    "external_id": row["external_id"],
                    "transaction_date": row["transaction_date"],
                    "quantity": qty,
                    "unit_price": float(row["unit_price"]),
                    "unit_cost": float(row["unit_cost"]),
                    "discount_amount": float(row["discount_amount"]),
                    "revenue": float(line_rev),
                    "gross_profit": float(line_rev - line_cost),
                    "is_synthetic": False,
                }
            ]
        )
        inserted += 1

    dataset.row_count = inserted
    job.status = "partial" if invalid else "succeeded"
    job.valid_rows = inserted
    job.invalid_rows = len(invalid)
    job.duplicate_rows = duplicates
    job.error_message = "\n".join(errors[:50]) if errors else None
    job.raw_report = {"errors": errors[:200], "invalid_rows": len(invalid)}
    _audit(
        db,
        principal,
        action="dataset.import",
        resource="dataset",
        resource_id=dataset.id,
        metadata={"valid": inserted, "invalid": len(invalid), "duplicates": duplicates, "filename": file.filename},
    )
    db.commit()
    return ImportResultOut(
        dataset_id=dataset.id,
        import_job_id=job.id,
        status=job.status,
        valid_rows=inserted,
        invalid_rows=len(invalid),
        duplicate_rows=duplicates,
        errors=errors[:50],
    )


# ── Business tools ────────────────────────────────────────────────────────
@router.get("/tools", response_model=list[dict])
def list_tools(
    principal: Principal = Depends(require_permission(PermissionCode.ANALYSIS_RUN)),
) -> list[dict]:
    registry = _tool_registry()
    return [
        {"name": s.name, "description": s.description, "permission": s.permission, "high_impact": s.high_impact}
        for s in registry.specs()
    ]


@router.post("/tools/run", response_model=ToolRunOut)
def run_tool(
    payload: ToolRunIn,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ToolRunOut:
    registry = _tool_registry()
    tool = registry.get(payload.tool)
    if str(tool.spec.permission) not in principal.permissions:
        raise HTTPException(403, f"Izin ditolak untuk tool {payload.tool}.")
    from ..tools.business import ToolContext

    context = ToolContext(
        organization_id=principal.organization_id,
        outlet_ids=principal.allowed_outlet_ids(),
        port=DatabaseToolDataPort(db),
        constraints=_constraints(),
    )
    try:
        result = registry.execute(
            payload.tool,
            payload.payload,
            context=context,
            principal_permissions=set(principal.permissions),
        )
    except ToolForbidden as exc:
        _audit(db, principal, action="tool.forbidden", resource="tool", resource_id=payload.tool, status="failure", metadata={"reason": str(exc)})
        db.commit()
        raise HTTPException(403, str(exc)) from exc
    except ToolError as exc:
        _audit(db, principal, action="tool.error", resource="tool", resource_id=payload.tool, status="failure", metadata={"reason": str(exc), "code": exc.code})
        db.commit()
        if exc.code == "data_unavailable":
            raise HTTPException(404, str(exc)) from exc
        raise HTTPException(422, str(exc)) from exc
    _audit(db, principal, action="tool.run", resource="tool", resource_id=payload.tool, metadata={"payload_keys": list(payload.payload.keys())})
    db.commit()
    return ToolRunOut(tool=result["tool"], result=result["result"], status="ok")


# ── Simulation ────────────────────────────────────────────────────────────
@router.post("/simulations", response_model=SimulationOut)
def create_simulation(
    payload: SimulationIn,
    principal: Principal = Depends(require_permission(PermissionCode.SIMULATION_RUN)),
    db: Session = Depends(get_db),
) -> SimulationOut:
    port = DatabaseToolDataPort(db)
    scope = effective_outlets(requested=payload.outlet_codes or None, authorized=principal.allowed_outlet_ids())
    rows = port.load_sales(
        organization_id=principal.organization_id,
        outlet_codes=scope,
        start=payload.start,
        end=payload.end,
    )
    if not rows:
        raise HTTPException(404, "Data penjualan tidak tersedia untuk simulasi ini. Unggah dataset terlebih dahulu.")
    from ..analytics.metrics import summarize

    summary = summarize([{"quantity": r.quantity, "unit_price": r.unit_price, "unit_cost": r.unit_cost, "discount_amount": r.discount_amount} for r in rows])
    baseline = simulation_engine.Baseline(
        revenue=summary.revenue,
        cost=summary.revenue - summary.gross_profit,
        units=summary.units,
        transactions=summary.transactions,
    )
    constraints = _constraints()
    scenarios = [
        simulation_engine.ScenarioInput(
            label=s.label or f"Diskon {s.discount_pct}%",
            discount_pct=Decimal(str(s.discount_pct)),
            volume_uplift_pct=Decimal(str(s.volume_uplift_pct)),
            period_days=s.period_days,
        )
        for s in payload.scenarios
    ]
    try:
        result = simulation_engine.simulate(baseline, scenarios, constraints)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    sim = SimulationRepository(db).create(
        organization_id=principal.organization_id,
        user_id=principal.user_id,
        title=payload.title,
        model_version=result.model_version,
        input_payload={
            "outlet_codes": payload.outlet_codes,
            "start": payload.start.isoformat() if payload.start else None,
            "end": payload.end.isoformat() if payload.end else None,
            "scenarios": [s.model_dump() for s in payload.scenarios],
        },
    )
    baseline_row = SimulationRepository(db).add_scenario(
        simulation_id=sim.id,
        label=result.baseline.label,
        is_baseline=True,
        inputs={"discount_pct": 0, "volume_uplift_pct": 0, "period_days": 1},
        outputs=_as_dict_safely(result.baseline),
        feasible=True,
        constraint_reasons=[],
    )
    scenario_rows = []
    for scenario_input, scenario_result in zip(scenarios, result.scenarios):
        row = SimulationRepository(db).add_scenario(
            simulation_id=sim.id,
            label=scenario_result.label,
            is_baseline=False,
            inputs=json_safe(scenario_input.__dict__),
            outputs=_as_dict_safely(scenario_result),
            feasible=scenario_result.feasible,
            constraint_reasons=scenario_result.violations,
        )
        scenario_rows.append({"id": row.id, **_as_dict_safely(scenario_result)})
    _audit(db, principal, action="simulation.create", resource="simulation", resource_id=sim.id, metadata={"scenarios": len(scenario_rows)})
    db.commit()
    return SimulationOut(
        id=sim.id,
        title=sim.title,
        model_version=sim.model_version,
        created_at=sim.created_at,
        computed_at=sim.computed_at,
        input_payload=sim.input_payload,
        scenarios=scenario_rows,
        baseline=json_safe(result.baseline.__dict__),
        sensitivity=json_safe([s.__dict__ for s in result.sensitivity]),
        assumptions=result.assumptions,
        limitations=result.limitations,
        formulas=result.formulas,
        constraints=result.constraints,
    )


@router.get("/simulations", response_model=list[dict])
def list_simulations(
    principal: Principal = Depends(require_permission(PermissionCode.SIMULATION_RUN)),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = SimulationRepository(db).list_for_org(principal.organization_id)
    return [{"id": s.id, "title": s.title, "model_version": s.model_version, "created_at": s.created_at.isoformat()} for s in rows]


@router.get("/simulations/{simulation_id}", response_model=SimulationOut)
def get_simulation(
    simulation_id: str,
    principal: Principal = Depends(require_permission(PermissionCode.SIMULATION_RUN)),
    db: Session = Depends(get_db),
) -> SimulationOut:
    sim = SimulationRepository(db).by_id(simulation_id)
    if sim is None or sim.organization_id != principal.organization_id:
        raise HTTPException(404, "Simulasi tidak ditemukan.")
    scenarios = []
    baseline = {}
    for s in sim.scenarios:
        data = dict(s.outputs or {})
        data["id"] = s.id
        data["label"] = s.label
        data["feasible"] = s.feasible
        data["violations"] = list(s.constraint_reasons or [])
        if s.is_baseline:
            baseline = data
        else:
            scenarios.append(data)
    return SimulationOut(
        id=sim.id,
        title=sim.title,
        model_version=sim.model_version,
        created_at=sim.created_at,
        computed_at=sim.computed_at,
        input_payload=sim.input_payload,
        scenarios=scenarios,
        baseline=baseline,
        sensitivity=[],
        assumptions=[],
        limitations=[],
        formulas={},
        constraints={},
    )


# ── Monitoring ────────────────────────────────────────────────────────────
@router.post("/monitoring/baselines", response_model=MonitoringBaselineOut)
def create_baseline(
    payload: MonitoringBaselineIn,
    principal: Principal = Depends(require_permission(PermissionCode.MONITORING_WRITE)),
    db: Session = Depends(get_db),
) -> MonitoringBaselineOut:
    repo = MonitoringRepository(db)
    baseline = repo.create_baseline(
        organization_id=principal.organization_id,
        simulation_id=payload.simulation_id,
        outlet_id=payload.outlet_id,
        label=payload.label,
        metric=payload.metric,
        predicted_value=payload.predicted_value,
        threshold_warning_pct=payload.threshold_warning_pct,
        threshold_critical_pct=payload.threshold_critical_pct,
        period_start=payload.period_start,
        period_end=payload.period_end,
        model_version="monitor-v1",
    )
    _audit(db, principal, action="monitoring.baseline_create", resource="monitoring", resource_id=baseline.id)
    db.commit()
    return MonitoringBaselineOut(
        id=baseline.id,
        label=baseline.label,
        metric=baseline.metric,
        predicted_value=float(baseline.predicted_value),
        threshold_warning_pct=float(baseline.threshold_warning_pct),
        threshold_critical_pct=float(baseline.threshold_critical_pct),
        period_start=baseline.period_start,
        period_end=baseline.period_end,
        model_version=baseline.model_version,
        simulation_id=baseline.simulation_id,
        outlet_id=baseline.outlet_id,
        created_at=baseline.created_at,
        latest=None,
    )


@router.get("/monitoring/baselines", response_model=list[MonitoringBaselineOut])
def list_baselines(
    principal: Principal = Depends(require_permission(PermissionCode.MONITORING_READ)),
    db: Session = Depends(get_db),
) -> list[MonitoringBaselineOut]:
    rows = MonitoringRepository(db).list_for_org(principal.organization_id)
    out: list[MonitoringBaselineOut] = []
    for b in rows:
        records = MonitoringRepository(db).records(b.id)
        latest = monitoring_engine.summarize_baseline(
            [{"actual_value": float(r.actual_value)} for r in records],
            float(b.predicted_value),
            warning_pct=float(b.threshold_warning_pct),
            critical_pct=float(b.threshold_critical_pct),
        )
        out.append(
            MonitoringBaselineOut(
                id=b.id,
                label=b.label,
                metric=b.metric,
                predicted_value=float(b.predicted_value),
                threshold_warning_pct=float(b.threshold_warning_pct),
                threshold_critical_pct=float(b.threshold_critical_pct),
                period_start=b.period_start,
                period_end=b.period_end,
                model_version=b.model_version,
                simulation_id=b.simulation_id,
                outlet_id=b.outlet_id,
                created_at=b.created_at,
                latest=latest,
            )
        )
    return out


@router.get("/monitoring/baselines/{baseline_id}", response_model=MonitoringBaselineOut)
def get_baseline(
    baseline_id: str,
    principal: Principal = Depends(require_permission(PermissionCode.MONITORING_READ)),
    db: Session = Depends(get_db),
) -> MonitoringBaselineOut:
    b = MonitoringRepository(db).by_id(baseline_id)
    if b is None or b.organization_id != principal.organization_id:
        raise HTTPException(404, "Baseline tidak ditemukan.")
    records = MonitoringRepository(db).records(b.id)
    latest = monitoring_engine.summarize_baseline(
        [{"actual_value": float(r.actual_value)} for r in records],
        float(b.predicted_value),
        warning_pct=float(b.threshold_warning_pct),
        critical_pct=float(b.threshold_critical_pct),
    )
    return MonitoringBaselineOut(
        id=b.id,
        label=b.label,
        metric=b.metric,
        predicted_value=float(b.predicted_value),
        threshold_warning_pct=float(b.threshold_warning_pct),
        threshold_critical_pct=float(b.threshold_critical_pct),
        period_start=b.period_start,
        period_end=b.period_end,
        model_version=b.model_version,
        simulation_id=b.simulation_id,
        outlet_id=b.outlet_id,
        created_at=b.created_at,
        latest=latest,
    )


@router.post("/monitoring/baselines/{baseline_id}/records", response_model=MonitoringRecordOut)
def record_actual(
    baseline_id: str,
    payload: MonitoringRecordIn,
    principal: Principal = Depends(require_permission(PermissionCode.MONITORING_WRITE)),
    db: Session = Depends(get_db),
) -> MonitoringRecordOut:
    repo = MonitoringRepository(db)
    b = repo.by_id(baseline_id)
    if b is None or b.organization_id != principal.organization_id:
        raise HTTPException(404, "Baseline tidak ditemukan.")
    result = monitoring_engine.evaluate(
        payload.actual_value,
        float(b.predicted_value),
        warning_pct=float(b.threshold_warning_pct),
        critical_pct=float(b.threshold_critical_pct),
    )
    record = repo.add_record(
        baseline_id=b.id,
        actual_value=payload.actual_value,
        variance=float(result.variance or 0),
        variance_pct=float(result.variance_pct or 0),
        status=result.status,
        note=payload.note,
        recorded_by=principal.user_id,
    )
    _audit(db, principal, action="monitoring.record_actual", resource="monitoring", resource_id=b.id, metadata={"status": result.status, "variance_pct": result.variance_pct})
    db.commit()
    return MonitoringRecordOut(
        id=record.id,
        actual_value=float(record.actual_value),
        variance=float(record.variance),
        variance_pct=float(record.variance_pct),
        status=record.status,
        note=record.note,
        recorded_at=record.recorded_at,
    )


# ── Decisions & approvals ─────────────────────────────────────────────────
@router.post("/decisions", response_model=DecisionOut)
def create_decision(
    payload: DecisionIn,
    principal: Principal = Depends(require_permission(PermissionCode.DECISION_CREATE)),
    db: Session = Depends(get_db),
) -> DecisionOut:
    decision = DecisionRepository(db).create(
        organization_id=principal.organization_id,
        simulation_id=payload.simulation_id,
        scenario_id=payload.scenario_id,
        created_by=principal.user_id,
        title=payload.title,
        decision_type=payload.decision_type,
        state="pending_approval",
        impact_level=payload.impact_level,
        payload=payload.payload,
    )
    _audit(db, principal, action="decision.create", resource="decision", resource_id=decision.id)
    db.commit()
    return DecisionOut(
        id=decision.id,
        title=decision.title,
        decision_type=decision.decision_type,
        state=decision.state,
        impact_level=decision.impact_level,
        simulation_id=decision.simulation_id,
        created_by=decision.created_by,
        created_at=decision.created_at,
        payload=decision.payload,
        approvals=[],
    )


@router.get("/decisions", response_model=list[DecisionOut])
def list_decisions(
    principal: Principal = Depends(require_permission(PermissionCode.DECISION_CREATE)),
    db: Session = Depends(get_db),
) -> list[DecisionOut]:
    rows = DecisionRepository(db).list_for_org(principal.organization_id)
    return [
        DecisionOut(
            id=d.id,
            title=d.title,
            decision_type=d.decision_type,
            state=d.state,
            impact_level=d.impact_level,
            simulation_id=d.simulation_id,
            created_by=d.created_by,
            created_at=d.created_at,
            payload=d.payload,
            approvals=[],
        )
        for d in rows
    ]


def _next_state(current: str, action: str, *, impact_level: str, has_revision: bool) -> str:
    if action == "approve":
        return "executing"
    if action == "reject":
        return "reexecuting"
    if action == "revise":
        if not has_revision:
            raise HTTPException(422, "Revisi memerlukan revision_parameters.")
        return "revision_requested"
    raise HTTPException(422, "Aksi keputusan tidak dikenal.")


@router.post("/decisions/{decision_id}/approvals", response_model=DecisionOut)
def approve_decision(
    decision_id: str,
    payload: ApprovalIn,
    principal: Principal = Depends(require_permission(PermissionCode.DECISION_APPROVE)),
    db: Session = Depends(get_db),
) -> DecisionOut:
    repo = DecisionRepository(db)
    decision = repo.by_id(decision_id)
    if decision is None or decision.organization_id != principal.organization_id:
        raise HTTPException(404, "Keputusan tidak ditemukan.")
    if decision.state != "pending_approval":
        raise HTTPException(409, f"Keputusan tidak dapat diproses pada state {decision.state}.")
    if decision.impact_level == "high" and payload.decision == "approve" and "llm" in str(payload.reason).lower():
        raise HTTPException(422, "Approval dampak tinggi tidak boleh dilakukan oleh LLM.")
    new_state = _next_state(
        decision.state,
        payload.decision,
        impact_level=decision.impact_level,
        has_revision=bool(payload.revision_parameters),
    )
    approval = repo.add_approval(
        decision_id=decision.id,
        actor_id=principal.user_id,
        decision_action=payload.decision,
        reason=payload.reason,
        revision_parameters=payload.revision_parameters,
        constraints=None,
        resulting_state=new_state,
    )
    decision.state = new_state
    _audit(
        db,
        principal,
        action=f"decision.{payload.decision}",
        resource="decision",
        resource_id=decision.id,
        metadata={"resulting_state": new_state, "impact_level": decision.impact_level},
    )
    db.commit()
    return DecisionOut(
        id=decision.id,
        title=decision.title,
        decision_type=decision.decision_type,
        state=decision.state,
        impact_level=decision.impact_level,
        simulation_id=decision.simulation_id,
        created_by=decision.created_by,
        created_at=decision.created_at,
        payload=decision.payload,
        approvals=[
            {
                "id": approval.id,
                "actor_id": approval.actor_id,
                "decision": approval.decision,
                "reason": approval.reason,
                "resulting_state": approval.resulting_state,
                "created_at": approval.created_at.isoformat(),
            }
        ],
    )


# ── Audit ─────────────────────────────────────────────────────────────────
@router.get("/audit", response_model=list[AuditOut])
def list_audit(
    principal: Principal = Depends(require_permission(PermissionCode.AUDIT_READ)),
    db: Session = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AuditOut]:
    rows = AuditRepository(db).list_for_org(principal.organization_id, limit=limit)
    return [
        AuditOut(
            id=a.id,
            action=a.action,
            resource=a.resource,
            resource_id=a.resource_id,
            status=a.status,
            actor_email=a.actor_email,
            created_at=a.created_at,
            metadata_json=a.metadata_json,
        )
        for a in rows
    ]
