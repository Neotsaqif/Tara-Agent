"""Deterministic promo simulation engine.

Given baseline sales aggregates and a proposed scenario (discount %, volume
uplift %, period days), compute revenue, gross profit, margin, promo subsidy,
break-even, constraints and sensitivity. Nothing here calls an LLM.

Terminology (kept explicit to avoid mixing):
* **Discount subsidy** — total rupiah price reduction consumers receive.
* **Promo cost** — in this model equal to the discount subsidy (no extra
  marketing spend). If external marketing spend is added later it must be
  tracked separately.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal

from ..analytics.metrics import MONEY, discount_amount, margin_pct
from ..constraints.gate import BusinessConstraints, evaluate_scenario

SIMULATION_MODEL_VERSION = "promo-sim-v2"
HUNDRED = Decimal("100")


@dataclass(frozen=True)
class Baseline:
    revenue: Decimal
    cost: Decimal
    units: int
    transactions: int

    @property
    def gross_profit(self) -> Decimal:
        return self.revenue - self.cost

    @property
    def margin_pct(self) -> Decimal:
        return margin_pct(self.revenue, self.gross_profit)


@dataclass(frozen=True)
class ScenarioInput:
    label: str
    discount_pct: Decimal
    volume_uplift_pct: Decimal
    period_days: int = 7


@dataclass(frozen=True)
class ScenarioResult:
    label: str
    discount_pct: float
    volume_uplift_pct: float
    period_days: int
    revenue: float
    gross_profit: float
    margin_pct: float
    discount_subsidy: float
    promo_cost: float
    revenue_delta: float
    gross_profit_delta: float
    break_even_units: int
    feasible: bool
    violations: list[str]
    warnings: list[str]
    is_baseline: bool = False


@dataclass(frozen=True)
class SensitivityPoint:
    discount_pct: float
    margin_pct: float
    gross_profit: float
    feasible: bool


@dataclass(frozen=True)
class SimulationResult:
    model_version: str
    computed_at: str
    baseline: ScenarioResult
    scenarios: list[ScenarioResult]
    sensitivity: list[SensitivityPoint]
    assumptions: list[str]
    limitations: list[str]
    formulas: dict[str, str]
    constraints: dict[str, float]


def _compute(base: Baseline, scenario: ScenarioInput, constraints: BusinessConstraints) -> ScenarioResult:
    """Deterministically compute a single scenario."""
    if base.revenue <= 0 or base.units <= 0:
        raise ValueError("Baseline tidak valid: butuh data penjualan dengan pendapatan dan unit > 0.")

    discount = scenario.discount_pct / HUNDRED
    uplift = Decimal(1) + scenario.volume_uplift_pct / HUNDRED

    gross_value = (base.revenue * uplift).quantize(MONEY)
    promo_revenue = (gross_value * (Decimal(1) - discount)).quantize(MONEY)
    promo_cost = (base.cost * uplift).quantize(MONEY)
    promo_gp = (promo_revenue - promo_cost).quantize(MONEY)
    subsidy = (gross_value * discount).quantize(MONEY)
    margin_val = margin_pct(promo_revenue, promo_gp) if promo_revenue > 0 else Decimal("0.00")

    # Break-even: units that must sell at discounted price to cover uplifted cost.
    if base.units > 0 and base.revenue > 0:
        per_unit_price = base.revenue / Decimal(base.units)
        discounted_unit = per_unit_price * (Decimal(1) - discount)
        if discounted_unit > 0:
            break_even = int((promo_cost / discounted_unit).to_integral_value(rounding="ROUND_CEILING"))
        else:
            break_even = 0
    else:
        break_even = 0

    # Constraint gate.
    gate = evaluate_scenario(
        discount_pct=scenario.discount_pct,
        resulting_margin_pct=margin_val,
        promo_cost=subsidy,
        constraints=constraints,
        data_ready=True,
        volume_uplift_pct=scenario.volume_uplift_pct,
        period_days=scenario.period_days,
    )

    return ScenarioResult(
        label=scenario.label,
        discount_pct=float(scenario.discount_pct),
        volume_uplift_pct=float(scenario.volume_uplift_pct),
        period_days=scenario.period_days,
        revenue=float(promo_revenue),
        gross_profit=float(promo_gp),
        margin_pct=float(margin_val),
        discount_subsidy=float(subsidy),
        promo_cost=float(subsidy),
        revenue_delta=float((promo_revenue - base.revenue).quantize(MONEY)),
        gross_profit_delta=float((promo_gp - base.gross_profit).quantize(MONEY)),
        break_even_units=max(0, break_even),
        feasible=gate.feasible,
        violations=list(gate.reasons),
        warnings=list(gate.warnings),
    )


def simulate(
    base: Baseline,
    scenarios: list[ScenarioInput],
    constraints: BusinessConstraints,
) -> SimulationResult:
    """Run a baseline + scenarios with full deterministic constraint validation."""
    if base.revenue <= 0 or base.units <= 0:
        raise ValueError("Baseline tidak valid: butuh data penjualan dengan pendapatan dan unit > 0.")

    baseline_result = ScenarioResult(
        label="Baseline (tanpa promo)",
        discount_pct=0.0,
        volume_uplift_pct=0.0,
        period_days=1,
        revenue=float(base.revenue),
        gross_profit=float(base.gross_profit),
        margin_pct=float(base.margin_pct),
        discount_subsidy=0.0,
        promo_cost=0.0,
        revenue_delta=0.0,
        gross_profit_delta=0.0,
        break_even_units=base.units,
        feasible=True,
        violations=[],
        warnings=[],
        is_baseline=True,
    )

    results = []
    for scenario in scenarios:
        results.append(_compute(base, scenario, constraints))

    sensitivity: list[SensitivityPoint] = []
    for pct in [0, 5, 10, 15, 20, 25, 30, 35, 40]:
        pt = _compute(
            base,
            ScenarioInput(label=f"{pct}%", discount_pct=Decimal(pct), volume_uplift_pct=Decimal(0), period_days=7),
            constraints,
        )
        sensitivity.append(
            SensitivityPoint(
                discount_pct=pct,
                margin_pct=pt.margin_pct,
                gross_profit=pt.gross_profit,
                feasible=pt.feasible,
            )
        )

    return SimulationResult(
        model_version=SIMULATION_MODEL_VERSION,
        computed_at=datetime.now(timezone.utc).isoformat(),
        baseline=baseline_result,
        scenarios=results,
        sensitivity=sensitivity,
        assumptions=[
            "Volume uplift adalah asumsi pengguna, bukan forecast terverifikasi.",
            "Harga jual dan HPP tetap selama periode simulasi.",
            "Tidak ada promo tumpang tindih dan tidak ada biaya marketing tambahan.",
            "Diskon subsidi = harga jual × diskon × volume (uplift), tidak termasuk ongkos operasional.",
        ],
        limitations=[
            "Hasil simulasi bukan hasil aktual; outcome nyata bergantung eksekusi pasar.",
            "Uplift default 0% hingga pengguna memberikan asumsi eksplisit.",
            "Biaya operasional, pajak, dan variabel lain tidak dimasukkan kecuali dinyatakan.",
        ],
        formulas={
            "gross_value_at_uplift": "baseline_revenue * (1 + volume_uplift)",
            "promo_revenue": "gross_value_at_uplift * (1 - discount)",
            "promo_cost": "baseline_cost * (1 + volume_uplift)",
            "gross_profit": "promo_revenue - promo_cost",
            "margin_pct": "gross_profit / promo_revenue * 100",
            "discount_subsidy": "gross_value_at_uplift * discount",
        },
        constraints={
            "max_discount_pct": float(constraints.max_discount_pct),
            "min_margin_pct": float(constraints.min_margin_pct),
            "promo_budget": float(constraints.promo_budget),
            "max_volume_uplift_pct": float(constraints.max_volume_uplift_pct),
        },
    )
