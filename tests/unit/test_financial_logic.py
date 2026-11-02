"""Regression suite for the metrics, constraint gate and simulation engine.

Covers the negative-margin bug (BUG-01/02), domain validation, and the
simulation feasibility default (BUG-06/07).
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

from app.analytics.metrics import margin, margin_pct, summarize  # noqa: E402
from app.constraints.gate import (  # noqa: E402
    BusinessConstraints,
    evaluate_scenario,
    validate_scenario_inputs,
)
from app.simulation import engine as sim  # noqa: E402


def _row(qty, price, cost, discount=0):
    return {"quantity": qty, "unit_price": Decimal(str(price)), "unit_cost": Decimal(str(cost)), "discount_amount": Decimal(str(discount))}


def test_margin_negative_is_preserved_not_clamped_to_zero():
    """BUG-01/02: cost > revenue must yield a NEGATIVE margin, never 0%."""
    s = summarize([_row(10, 100, 130)])
    assert s.gross_profit < 0
    assert s.gross_margin_pct < 0
    assert s.gross_margin_pct == Decimal("-30.00")


def test_margin_pct_zero_revenue_returns_zero():
    assert margin_pct(Decimal(0), Decimal(-5)) == Decimal("0.00")


def test_margin_pct_rejects_negative_revenue():
    with pytest.raises(ValueError):
        margin_pct(Decimal(-1), Decimal(0))


def test_summarize_rejects_negative_quantities():
    with pytest.raises(ValueError):
        summarize([_row(-1, 10, 5)])


def test_summarize_rejects_discount_exceeding_line_revenue():
    with pytest.raises(ValueError):
        summarize([_row(1, 10, 5, discount=20)])


def test_summarize_handles_loss_with_discount():
    s = summarize([_row(5, 50, 60, discount=10)])
    assert s.revenue == Decimal("240.00")
    assert s.gross_profit < 0
    assert s.gross_margin_pct < 0


def test_constraint_gate_blocks_data_not_ready():
    result = evaluate_scenario(
        discount_pct=Decimal(10),
        resulting_margin_pct=Decimal(50),
        promo_cost=Decimal(0),
        constraints=BusinessConstraints(),
        data_ready=False,
    )
    assert not result.feasible
    assert any(v.code == "data_ready" for v in result.violations)


def test_constraint_gate_blocks_discount_over_max():
    result = evaluate_scenario(
        discount_pct=Decimal(35),
        resulting_margin_pct=Decimal(50),
        promo_cost=Decimal(0),
        constraints=BusinessConstraints(max_discount_pct=Decimal(30)),
    )
    assert not result.feasible
    assert any(v.code == "max_discount" for v in result.violations)


def test_constraint_gate_blocks_negative_margin():
    result = evaluate_scenario(
        discount_pct=Decimal(10),
        resulting_margin_pct=Decimal(-5),
        promo_cost=Decimal(0),
        constraints=BusinessConstraints(min_margin_pct=Decimal(40)),
    )
    assert not result.feasible
    assert any(v.code == "min_margin" for v in result.violations)


def test_validate_scenario_inputs_rejects_unrealistic_uplift():
    violations = validate_scenario_inputs(
        discount_pct=Decimal(10),
        volume_uplift_pct=Decimal(2000),
        period_days=7,
        constraints=BusinessConstraints(),
    )
    assert any(v.code == "uplift_unrealistic" for v in violations)


def test_validate_scenario_inputs_rejects_period_zero():
    violations = validate_scenario_inputs(
        discount_pct=Decimal(10),
        volume_uplift_pct=Decimal(10),
        period_days=0,
        constraints=BusinessConstraints(),
    )
    assert any(v.code == "period_invalid" for v in violations)


def test_simulation_feasible_is_false_when_constraints_violated():
    base = sim.Baseline(revenue=Decimal("100000"), cost=Decimal(40000), units=100, transactions=10)
    constraints = BusinessConstraints(min_margin_pct=Decimal(40), promo_budget=Decimal(1000))
    result = sim.simulate(
        base,
        [sim.ScenarioInput(label="A", discount_pct=Decimal(25), volume_uplift_pct=Decimal(50), period_days=7)],
        constraints,
    )
    # 25% discount + 50% uplift: subsidy 100k*0.25*1.5 = 37.5k > promo_budget 1k
    assert result.scenarios[0].feasible is False
    assert result.scenarios[0].violations


def test_simulation_baseline_is_feasible_and_labelled():
    base = sim.Baseline(revenue=Decimal("100000"), cost=Decimal(40000), units=100, transactions=10)
    result = sim.simulate(base, [], BusinessConstraints())
    assert result.baseline.is_baseline is True
    assert result.baseline.feasible is True


def test_simulation_rejects_invalid_baseline():
    with pytest.raises(ValueError):
        sim.simulate(sim.Baseline(revenue=Decimal(0), cost=Decimal(0), units=0, transactions=0), [], BusinessConstraints())


def test_simulation_has_documented_formulas_and_constraints():
    base = sim.Baseline(revenue=Decimal("100000"), cost=Decimal(40000), units=100, transactions=10)
    result = sim.simulate(
        base,
        [sim.ScenarioInput(label="A", discount_pct=Decimal(10), volume_uplift_pct=Decimal(0), period_days=7)],
        BusinessConstraints(),
    )
    assert "promo_revenue" in result.formulas
    assert "discount_subsidy" in result.formulas
    assert "max_discount_pct" in result.constraints
    assert result.assumptions
    assert result.limitations


def test_margin_function_kept_for_compat():
    """margin() must accept loss-making cases (not raise like the old code)."""
    assert margin(Decimal(100), Decimal(150)) == Decimal("-50.00")


def test_summarize_average_order_value_is_revenue_over_transactions():
    s = summarize([_row(2, 100, 50), _row(3, 100, 50)])
    assert s.transactions == 2
    assert s.average_order_value == Decimal("250.00")
