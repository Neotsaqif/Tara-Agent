"""Typed business-tool registry.

Each tool has a Pydantic input/output schema, permission requirement, and
deterministic computation. The AgentCore selects and executes tools; the LLM
only helps decide *which* tool is relevant and how to phrase the answer.
Numbers always come from here.

Tools operate on a :class:`ToolDataPort`. The production implementation
(:class:`DatabaseToolDataPort`) reads SQLAlchemy rows and **always** intersects
requested outlets with the caller's authorized outlets (see :func:`effective_outlets`).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Protocol

from pydantic import BaseModel, Field, ValidationError

from ..analytics.metrics import MONEY, margin_pct, summarize, to_decimal
from ..auth.rbac import PermissionCode
from ..constraints.gate import BusinessConstraints, evaluate_scenario


class ToolError(RuntimeError):
    def __init__(self, message: str, *, code: str = "tool_error") -> None:
        super().__init__(message)
        self.code = code


class ToolDataUnavailable(ToolError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="data_unavailable")


class ToolForbidden(ToolError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="forbidden")


# ── Data port ─────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class SalesRow:
    outlet_code: str
    product_sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    discount_amount: Decimal
    transaction_date: datetime


@dataclass(frozen=True)
class ToolData:
    rows: list[SalesRow]
    products: dict[str, dict] = field(default_factory=dict)  # sku -> {name, category, price, cost}
    applied_outlet_codes: tuple[str, ...] = ()
    period_start: datetime | None = None
    period_end: datetime | None = None


class ToolDataPort(Protocol):
    def load_sales(
        self,
        *,
        organization_id: str,
        outlet_codes: list[str] | None,
        start: datetime | None,
        end: datetime | None,
    ) -> list[SalesRow]: ...

    def load_products(self, *, organization_id: str) -> dict[str, dict]: ...

    def resolve_outlet_codes(self, *, organization_id: str, outlet_codes: list[str]) -> list[str]:
        """Map outlet *codes* or *ids* to canonical outlet ids inside the org."""
        ...


class InMemoryToolDataPort:
    """Fixture port for unit tests only."""

    def __init__(self, rows: list[SalesRow], products: dict[str, dict] | None = None) -> None:
        self._rows = list(rows)
        self._products = products or {}

    def load_sales(self, *, organization_id, outlet_codes, start, end):  # noqa: ANN001
        rows = self._rows
        if outlet_codes:
            codes = set(outlet_codes)
            rows = [r for r in rows if r.outlet_code in codes]
        if start:
            rows = [r for r in rows if r.transaction_date >= start]
        if end:
            rows = [r for r in rows if r.transaction_date <= end]
        return list(rows)

    def load_products(self, *, organization_id):  # noqa: ANN001
        return dict(self._products)

    def resolve_outlet_codes(self, *, organization_id, outlet_codes):  # noqa: ANN001
        return list(outlet_codes)


# ── Tool definition ───────────────────────────────────────────────────────
class ToolSpec(BaseModel):
    name: str
    description: str
    permission: str
    high_impact: bool = False


class BaseTool:
    spec: ToolSpec
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    requires_data: bool = True

    def run(self, inputs: BaseModel, data: ToolData, constraints: BusinessConstraints) -> BaseModel:  # pragma: no cover
        raise NotImplementedError


# ── Inputs ────────────────────────────────────────────────────────────────
class PeriodInput(BaseModel):
    start: datetime | None = None
    end: datetime | None = None
    outlet_codes: list[str] = Field(default_factory=list)

    @classmethod
    def from_params(cls, params: dict[str, Any] | None) -> "PeriodInput":
        params = params or {}
        return cls(
            start=params.get("start"),
            end=params.get("end"),
            outlet_codes=list(params.get("outlet_codes") or []),
        )


class SalesSummaryInput(PeriodInput):
    pass


class ToolEvidence(BaseModel):
    source: str
    rows: int
    period: str
    note: str = ""


class SalesSummaryOutput(BaseModel):
    status: str = "ok"
    transactions: int
    units: int
    revenue: float
    gross_profit: float
    gross_margin_pct: float
    average_order_value: float
    discount_total: float = 0.0
    evidence: list[ToolEvidence] = Field(default_factory=list)


class ProductPerformanceInput(PeriodInput):
    limit: int = Field(default=5, ge=1, le=50)


class ProductPerformanceItem(BaseModel):
    sku: str
    name: str
    revenue: float
    units: int
    gross_profit: float
    gross_margin_pct: float


class ProductPerformanceOutput(BaseModel):
    status: str = "ok"
    top: list[ProductPerformanceItem]
    total_revenue: float
    evidence: list[ToolEvidence] = Field(default_factory=list)


class OutletComparisonInput(PeriodInput):
    pass


class OutletComparisonItem(BaseModel):
    outlet_code: str
    revenue: float
    transactions: int
    gross_profit: float
    gross_margin_pct: float


class OutletComparisonOutput(BaseModel):
    status: str = "ok"
    outlets: list[OutletComparisonItem]
    best_outlet: str | None = None
    evidence: list[ToolEvidence] = Field(default_factory=list)


class ProfitMarginInput(PeriodInput):
    minimum_margin_pct: float = 40.0


class ProfitMarginOutput(BaseModel):
    status: str = "ok"
    revenue: float
    cost: float
    gross_profit: float
    gross_margin_pct: float
    below_minimum: bool
    evidence: list[ToolEvidence] = Field(default_factory=list)


class RevenueCalculatorInput(BaseModel):
    """Explicit formula input: units × price, minus discount."""

    units: int = Field(ge=0, le=10_000_000)
    unit_price: float = Field(ge=0)
    discount_pct: float = Field(default=0, ge=0, le=100)


class RevenueCalculatorOutput(BaseModel):
    status: str = "ok"
    gross_value: float
    discount_amount: float
    net_revenue: float
    formula: str


class CostCalculatorInput(BaseModel):
    units: int = Field(ge=0, le=10_000_000)
    unit_cost: float = Field(ge=0)


class CostCalculatorOutput(BaseModel):
    status: str = "ok"
    total_cost: float
    formula: str


class PromoAnalysisInput(PeriodInput):
    discount_pct: float = Field(ge=0, le=100)
    expected_volume_uplift_pct: float = Field(default=0, ge=0, le=500)


class PromoAnalysisOutput(BaseModel):
    status: str = "ok"
    discount_pct: float
    expected_volume_uplift_pct: float
    baseline_revenue: float
    baseline_cost: float
    baseline_gross_profit: float
    baseline_margin_pct: float
    promo_revenue: float
    promo_cost: float
    promo_gross_profit: float
    promo_margin_pct: float
    discount_subsidy: float
    revenue_delta: float
    gross_profit_delta: float
    feasible: bool
    violations: list[str]
    warnings: list[str] = Field(default_factory=list)
    evidence: list[ToolEvidence] = Field(default_factory=list)


class DataQualityInput(PeriodInput):
    pass


class DataQualityOutput(BaseModel):
    status: str = "ok"
    rows: int
    outlets: int
    products: int
    period_days: int
    missing_cost_rows: int
    zero_price_rows: int
    duplicate_external_ids: int
    ready: bool
    issues: list[str]


class ConstraintValidateInput(BaseModel):
    discount_pct: float = Field(ge=0, le=100)
    resulting_margin_pct: float
    promo_cost: float = Field(default=0, ge=0)
    data_ready: bool = True


class ConstraintValidateOutput(BaseModel):
    feasible: bool
    violations: list[str]
    warnings: list[str]


# ── Outlet scope resolution (security-critical) ───────────────────────────
def effective_outlets(
    *,
    requested: list[str] | None,
    authorized: list[str] | None,
) -> list[str] | None:
    """Compute ``Requested ∩ Authorized``.

    * ``authorized is None`` means the caller has tenant-wide access.
    * ``authorized == []`` means the caller has **no** outlet access at all —
      never treat an empty list as "all outlets".
    * When ``requested`` is empty, "all authorized" is used.

    Returns the intersection; if the request includes any outlet outside the
    authorized scope, :class:`ToolForbidden` is raised (safe rejection rather
    than silently dropping scopes).
    """
    if authorized is not None and len(authorized) == 0:
        raise ToolForbidden("Akun Anda tidak memiliki akses ke outlet mana pun.")

    if not requested:
        return list(authorized) if authorized is not None else None

    requested_set = {str(item) for item in requested}
    if authorized is None:
        return sorted(requested_set)

    authorized_set = {str(item) for item in authorized}
    unauthorized = requested_set - authorized_set
    if unauthorized:
        raise ToolForbidden(
            "Permintaan menyertakan outlet di luar wewenang Anda. "
            "Hanya outlet yang diizinkan yang dapat dianalisis."
        )
    return sorted(requested_set)


def _resolve_scope(context: "ToolContext", period: PeriodInput) -> list[str] | None:
    """Validate requested outlet codes/ids against the principal's scope."""
    resolved_requested = (
        context.port.resolve_outlet_codes(organization_id=context.organization_id, outlet_codes=list(period.outlet_codes))
        if period.outlet_codes
        else []
    )
    if period.outlet_codes and len(resolved_requested) != len(set(period.outlet_codes)):
        raise ToolForbidden("Satu atau lebih kode outlet tidak dikenal pada organisasi ini.")
    return effective_outlets(requested=resolved_requested or None, authorized=context.outlet_ids)


def _load(context: "ToolContext", period: PeriodInput) -> ToolData:
    scope = _resolve_scope(context, period)
    rows = context.port.load_sales(
        organization_id=context.organization_id,
        outlet_codes=scope,
        start=period.start,
        end=period.end,
    )
    if not rows:
        raise ToolDataUnavailable(
            "Data penjualan tidak tersedia untuk periode/outlet ini. Unggah dataset atau perluas periode."
        )
    products = context.port.load_products(organization_id=context.organization_id)
    outlet_codes = tuple(sorted({r.outlet_code for r in rows}))
    dates = [r.transaction_date for r in rows]
    return ToolData(
        rows=rows,
        products=products,
        applied_outlet_codes=outlet_codes,
        period_start=min(dates),
        period_end=max(dates),
    )


def _period_label(period: PeriodInput, data: ToolData | None = None) -> str:
    start = period.start.date().isoformat() if period.start else (data.period_start.date().isoformat() if data and data.period_start else "awal")
    end = period.end.date().isoformat() if period.end else (data.period_end.date().isoformat() if data and data.period_end else "sekarang")
    return f"{start} s.d. {end}"


@dataclass(frozen=True)
class ToolContext:
    organization_id: str
    outlet_ids: list[str] | None  # None => tenant-wide; [] => no access
    port: ToolDataPort
    constraints: BusinessConstraints = field(default_factory=BusinessConstraints)


# ── Tools ─────────────────────────────────────────────────────────────────
def _rows_as_dicts(rows: list[SalesRow]) -> list[dict]:
    return [
        {
            "quantity": r.quantity,
            "unit_price": r.unit_price,
            "unit_cost": r.unit_cost,
            "discount_amount": r.discount_amount,
        }
        for r in rows
    ]


def _line_revenue(row: SalesRow) -> Decimal:
    return (Decimal(row.quantity) * row.unit_price - row.discount_amount).quantize(MONEY)


def _line_cost(row: SalesRow) -> Decimal:
    return (Decimal(row.quantity) * row.unit_cost).quantize(MONEY)


class SalesSummaryTool(BaseTool):
    spec = ToolSpec(name="sales_summary", description="Ringkasan transaksi, unit, pendapatan, dan margin kotor.", permission=str(PermissionCode.ANALYSIS_RUN))
    input_model = SalesSummaryInput
    output_model = SalesSummaryOutput

    def run(self, inputs: SalesSummaryInput, data: ToolData, constraints: BusinessConstraints) -> SalesSummaryOutput:
        summary = summarize(_rows_as_dicts(data.rows))
        ev = ToolEvidence(source="sales_transactions", rows=len(data.rows), period=_period_label(inputs, data))
        return SalesSummaryOutput(
            transactions=summary.transactions,
            units=summary.units,
            revenue=float(summary.revenue),
            gross_profit=float(summary.gross_profit),
            gross_margin_pct=float(summary.gross_margin_pct),
            average_order_value=float(summary.average_order_value),
            discount_total=float(summary.discount_total),
            evidence=[ev],
        )


class ProductPerformanceTool(BaseTool):
    spec = ToolSpec(name="product_performance", description="Performa produk teratas berdasarkan pendapatan dan margin.", permission=str(PermissionCode.ANALYSIS_RUN))
    input_model = ProductPerformanceInput
    output_model = ProductPerformanceOutput

    def run(self, inputs: ProductPerformanceInput, data: ToolData, constraints: BusinessConstraints) -> ProductPerformanceOutput:
        agg: dict[str, dict] = {}
        for r in data.rows:
            bucket = agg.setdefault(r.product_sku, {"name": r.product_name, "revenue": Decimal(0), "units": 0, "gp": Decimal(0)})
            line_rev = _line_revenue(r)
            bucket["revenue"] += line_rev
            bucket["units"] += r.quantity
            bucket["gp"] += line_rev - _line_cost(r)
        items: list[ProductPerformanceItem] = []
        for sku, b in agg.items():
            gp = b["gp"].quantize(MONEY)
            gm = float(margin_pct(b["revenue"], gp)) if b["revenue"] > 0 else (None if b["revenue"] == 0 else float(margin_pct(b["revenue"], gp)))
            items.append(
                ProductPerformanceItem(
                    sku=sku,
                    name=b["name"],
                    revenue=float(b["revenue"].quantize(MONEY)),
                    units=b["units"],
                    gross_profit=float(gp),
                    gross_margin_pct=gm if gm is not None else 0.0,
                )
            )
        items.sort(key=lambda i: i.revenue, reverse=True)
        top = items[: max(1, inputs.limit)]
        total = float(sum((b["revenue"] for b in agg.values()), Decimal(0)).quantize(MONEY))
        return ProductPerformanceOutput(
            top=top,
            total_revenue=total,
            evidence=[ToolEvidence(source="sales_transactions", rows=len(data.rows), period=_period_label(inputs, data))],
        )


class OutletComparisonTool(BaseTool):
    spec = ToolSpec(name="outlet_comparison", description="Bandingkan pendapatan dan margin antar outlet.", permission=str(PermissionCode.ANALYSIS_RUN))
    input_model = OutletComparisonInput
    output_model = OutletComparisonOutput

    def run(self, inputs: OutletComparisonInput, data: ToolData, constraints: BusinessConstraints) -> OutletComparisonOutput:
        agg: dict[str, dict] = {}
        for r in data.rows:
            bucket = agg.setdefault(r.outlet_code, {"revenue": Decimal(0), "tx": 0, "gp": Decimal(0)})
            line_rev = _line_revenue(r)
            bucket["revenue"] += line_rev
            bucket["tx"] += 1
            bucket["gp"] += line_rev - _line_cost(r)
        items = [
            OutletComparisonItem(
                outlet_code=code,
                revenue=float(b["revenue"].quantize(MONEY)),
                transactions=b["tx"],
                gross_profit=float(b["gp"].quantize(MONEY)),
                gross_margin_pct=float(margin_pct(b["revenue"], b["gp"])) if b["revenue"] > 0 else 0.0,
            )
            for code, b in agg.items()
        ]
        items.sort(key=lambda i: i.revenue, reverse=True)
        return OutletComparisonOutput(
            outlets=items,
            best_outlet=items[0].outlet_code if items else None,
            evidence=[ToolEvidence(source="sales_transactions", rows=len(data.rows), period=_period_label(inputs, data))],
        )


class ProfitMarginTool(BaseTool):
    spec = ToolSpec(name="profit_margin", description="Hitung pendapatan, laba kotor, dan apakah margin di bawah minimum.", permission=str(PermissionCode.ANALYSIS_RUN))
    input_model = ProfitMarginInput
    output_model = ProfitMarginOutput

    def run(self, inputs: ProfitMarginInput, data: ToolData, constraints: BusinessConstraints) -> ProfitMarginOutput:
        s = summarize(_rows_as_dicts(data.rows))
        gm = float(s.gross_margin_pct)
        return ProfitMarginOutput(
            revenue=float(s.revenue),
            cost=float((s.revenue - s.gross_profit).quantize(MONEY)),
            gross_profit=float(s.gross_profit),
            gross_margin_pct=gm,
            below_minimum=gm < inputs.minimum_margin_pct,
            evidence=[ToolEvidence(source="sales_transactions", rows=len(data.rows), period=_period_label(inputs, data))],
        )


class RevenueCalculatorTool(BaseTool):
    spec = ToolSpec(name="revenue_calculator", description="Hitung pendapatan dari unit × harga, dengan diskon opsional.", permission=str(PermissionCode.ANALYSIS_RUN))
    input_model = RevenueCalculatorInput
    output_model = RevenueCalculatorOutput
    requires_data = False

    def run(self, inputs: RevenueCalculatorInput, data: ToolData, constraints: BusinessConstraints) -> RevenueCalculatorOutput:
        gross = (Decimal(inputs.units) * to_decimal(inputs.unit_price)).quantize(MONEY)
        discount = (gross * to_decimal(inputs.discount_pct) / Decimal(100)).quantize(MONEY)
        net = (gross - discount).quantize(MONEY)
        return RevenueCalculatorOutput(
            gross_value=float(gross),
            discount_amount=float(discount),
            net_revenue=float(net),
            formula="net_revenue = units * unit_price - (units * unit_price * discount_pct / 100)",
        )


class CostCalculatorTool(BaseTool):
    spec = ToolSpec(name="cost_calculator", description="Hitung total HPP dari unit × biaya per unit.", permission=str(PermissionCode.ANALYSIS_RUN))
    input_model = CostCalculatorInput
    output_model = CostCalculatorOutput
    requires_data = False

    def run(self, inputs: CostCalculatorInput, data: ToolData, constraints: BusinessConstraints) -> CostCalculatorOutput:
        total = (Decimal(inputs.units) * to_decimal(inputs.unit_cost)).quantize(MONEY)
        return CostCalculatorOutput(total_cost=float(total), formula="total_cost = units * unit_cost")


class PromoAnalysisTool(BaseTool):
    spec = ToolSpec(name="promo_analysis", description="Analisis dampak diskon terhadap pendapatan dan margin.", permission=str(PermissionCode.SIMULATION_RUN))
    input_model = PromoAnalysisInput
    output_model = PromoAnalysisOutput

    def run(self, inputs: PromoAnalysisInput, data: ToolData, constraints: BusinessConstraints) -> PromoAnalysisOutput:
        s = summarize(_rows_as_dicts(data.rows))
        discount = to_decimal(inputs.discount_pct) / Decimal(100)
        uplift = Decimal(1) + to_decimal(inputs.expected_volume_uplift_pct) / Decimal(100)
        baseline_rev = s.revenue
        baseline_cost = (baseline_rev - s.gross_profit).quantize(MONEY)
        # Gross value before existing discounts, scaled by assumed volume uplift.
        gross_at_uplift = (baseline_rev * uplift).quantize(MONEY)
        promo_rev = (gross_at_uplift * (Decimal(1) - discount)).quantize(MONEY)
        promo_cost = (baseline_cost * uplift).quantize(MONEY)
        promo_gp = (promo_rev - promo_cost).quantize(MONEY)
        promo_margin = margin_pct(promo_rev, promo_gp) if promo_rev > 0 else Decimal("0.00")
        subsidy = (gross_at_uplift * discount).quantize(MONEY)
        result = evaluate_scenario(
            discount_pct=to_decimal(inputs.discount_pct),
            resulting_margin_pct=promo_margin,
            promo_cost=subsidy,
            constraints=constraints,
            data_ready=True,
            volume_uplift_pct=to_decimal(inputs.expected_volume_uplift_pct),
        )
        return PromoAnalysisOutput(
            discount_pct=inputs.discount_pct,
            expected_volume_uplift_pct=inputs.expected_volume_uplift_pct,
            baseline_revenue=float(baseline_rev),
            baseline_cost=float(baseline_cost),
            baseline_gross_profit=float(s.gross_profit),
            baseline_margin_pct=float(s.gross_margin_pct),
            promo_revenue=float(promo_rev),
            promo_cost=float(promo_cost),
            promo_gross_profit=float(promo_gp),
            promo_margin_pct=float(promo_margin),
            discount_subsidy=float(subsidy),
            revenue_delta=float((promo_rev - baseline_rev).quantize(MONEY)),
            gross_profit_delta=float((promo_gp - s.gross_profit).quantize(MONEY)),
            feasible=result.feasible,
            violations=list(result.reasons),
            warnings=list(result.warnings),
            evidence=[
                ToolEvidence(
                    source="sales_transactions",
                    rows=len(data.rows),
                    period=_period_label(inputs, data),
                    note="Proyeksi volume berbasis assumption uplift yang diberikan pengguna (bukan forecast terverifikasi).",
                )
            ],
        )


class DataQualityTool(BaseTool):
    spec = ToolSpec(name="data_quality", description="Validasi kelengkapan dan kesiapan dataset.", permission=str(PermissionCode.DATA_READ))
    input_model = DataQualityInput
    output_model = DataQualityOutput

    def run(self, inputs: DataQualityInput, data: ToolData, constraints: BusinessConstraints) -> DataQualityOutput:
        outlets = {r.outlet_code for r in data.rows}
        products = {r.product_sku for r in data.rows}
        missing_cost = sum(1 for r in data.rows if r.unit_cost <= 0)
        zero_price = sum(1 for r in data.rows if r.unit_price <= 0)
        days = len({r.transaction_date.date() for r in data.rows})
        issues: list[str] = []
        if missing_cost:
            issues.append(f"{missing_cost} baris memiliki HPP 0 atau tidak valid.")
        if zero_price:
            issues.append(f"{zero_price} baris memiliki harga jual 0 atau tidak valid.")
        ready = len(data.rows) > 0 and missing_cost == 0 and zero_price == 0
        if not ready:
            issues.append("Dataset belum layak untuk simulasi margin.")
        return DataQualityOutput(
            rows=len(data.rows),
            outlets=len(outlets),
            products=len(products),
            period_days=days,
            missing_cost_rows=missing_cost,
            zero_price_rows=zero_price,
            duplicate_external_ids=0,
            ready=ready,
            issues=issues,
        )


class ConstraintValidateTool(BaseTool):
    spec = ToolSpec(name="constraint_validate", description="Validasi skenario terhadap batas diskon, margin, dan anggaran.", permission=str(PermissionCode.SIMULATION_RUN))
    input_model = ConstraintValidateInput
    output_model = ConstraintValidateOutput
    requires_data = False

    def run(self, inputs: ConstraintValidateInput, data: ToolData, constraints: BusinessConstraints) -> ConstraintValidateOutput:
        result = evaluate_scenario(
            discount_pct=to_decimal(inputs.discount_pct),
            resulting_margin_pct=to_decimal(inputs.resulting_margin_pct),
            promo_cost=to_decimal(inputs.promo_cost),
            constraints=constraints,
            data_ready=inputs.data_ready,
        )
        return ConstraintValidateOutput(feasible=result.feasible, violations=list(result.reasons), warnings=list(result.warnings))


# ── Registry ──────────────────────────────────────────────────────────────
class ToolRegistry:
    def __init__(self, tools: list[BaseTool] | None = None) -> None:
        self._tools: dict[str, BaseTool] = {}
        for tool in tools or default_tools():
            self._tools[tool.spec.name] = tool

    def names(self) -> list[str]:
        return list(self._tools.keys())

    def get(self, name: str) -> BaseTool:
        tool = self._tools.get(name)
        if tool is None:
            raise ToolError(f"Tool tidak dikenal: {name}", code="unknown_tool")
        return tool

    def specs(self) -> list[ToolSpec]:
        return [t.spec for t in self._tools.values()]

    def execute(
        self,
        name: str,
        payload: dict[str, Any],
        *,
        context: ToolContext,
        principal_permissions: set[str],
    ) -> dict[str, Any]:
        """Allow-listed execution with permission, schema and scope validation."""
        tool = self.get(name)
        if tool.spec.permission not in principal_permissions:
            raise ToolForbidden(f"Izin ditolak untuk tool {name}.")
        try:
            inputs = tool.input_model.model_validate(payload)
        except ValidationError as exc:
            first = exc.errors()[0] if exc.errors() else {}
            raise ToolError(f"Input tool tidak valid: {first.get('msg', 'unknown')}", code="invalid_input") from exc
        if tool.requires_data or isinstance(inputs, PeriodInput):
            period = inputs if isinstance(inputs, PeriodInput) else PeriodInput()
            data = _load(context, period)
        else:
            data = ToolData(rows=[])
        output = tool.run(inputs, data, context.constraints)
        return {"tool": name, "result": output.model_dump()}


def default_tools() -> list[BaseTool]:
    return [
        SalesSummaryTool(),
        ProductPerformanceTool(),
        OutletComparisonTool(),
        ProfitMarginTool(),
        RevenueCalculatorTool(),
        CostCalculatorTool(),
        PromoAnalysisTool(),
        DataQualityTool(),
        ConstraintValidateTool(),
    ]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
