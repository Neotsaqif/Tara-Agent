"""Business tools + outlet scope security regression tests (BUG-03)."""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

from app.constraints.gate import BusinessConstraints  # noqa: E402
from app.tools.business import (  # noqa: E402
    InMemoryToolDataPort,
    SalesRow,
    ToolContext,
    ToolDataUnavailable,
    ToolError,
    ToolForbidden,
    ToolRegistry,
    effective_outlets,
)


def _row(outlet, qty=10, price=100, cost=60, discount=0):
    return SalesRow(
        outlet_code=outlet,
        product_sku="KP-001",
        product_name="Kopi",
        quantity=qty,
        unit_price=Decimal(str(price)),
        unit_cost=Decimal(str(cost)),
        discount_amount=Decimal(str(discount)),
        transaction_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


# ── effective_outlets security ────────────────────────────────────────────
def test_empty_authorized_list_is_never_all_outlets():
    """An empty authorized list must NOT be treated as 'all outlets'."""
    with pytest.raises(ToolForbidden):
        effective_outlets(requested=[], authorized=[])


def test_requested_intersection_with_authorized():
    # "A" is in both; "B" is not in authorized so this must fail.
    with pytest.raises(ToolForbidden):
        effective_outlets(requested=["A", "B"], authorized=["A", "C"])


def test_requested_outside_authorized_is_forbidden():
    with pytest.raises(ToolForbidden):
        effective_outlets(requested=["A", "Z"], authorized=["A", "B"])


def test_tenant_wide_returns_none():
    assert effective_outlets(requested=None, authorized=None) is None


def test_requested_empty_returns_all_authorized():
    assert effective_outlets(requested=None, authorized=["A", "B"]) == ["A", "B"]


# ── Tool registry ─────────────────────────────────────────────────────────
def test_unknown_tool_rejected():
    registry = ToolRegistry()
    with pytest.raises(ToolError):
        registry.get("does_not_exist")


def test_sales_summary_with_data():
    rows = [_row("CITY", 10, 100, 60), _row("CITY", 5, 100, 60, discount=50)]
    port = InMemoryToolDataPort(rows, products={"KP-001": {"name": "Kopi", "category": "Minuman", "price": Decimal(100), "cost": Decimal(60)}})
    context = ToolContext(organization_id="org", outlet_ids=None, port=port, constraints=BusinessConstraints())
    out = ToolRegistry().execute("sales_summary", {}, context=context, principal_permissions={"analysis:run"})
    assert out["result"]["transactions"] == 2
    assert out["result"]["revenue"] == 1450.0


def test_sales_summary_unavailable_when_no_rows():
    port = InMemoryToolDataPort([])
    context = ToolContext(organization_id="org", outlet_ids=["A"], port=port, constraints=BusinessConstraints())
    with pytest.raises(ToolDataUnavailable):
        ToolRegistry().execute("sales_summary", {}, context=context, principal_permissions={"analysis:run"})


def test_outlet_scope_filtering_applies_in_tool():
    """Caller authorized to CITY only must not see CAMPUS rows."""
    rows = [_row("CITY", 10, 100, 60), _row("CAMPUS", 10, 100, 60)]
    port = InMemoryToolDataPort(rows)
    context = ToolContext(organization_id="org", outlet_ids=["CITY-ID"], port=port, constraints=BusinessConstraints())
    # The in-memory port does not resolve codes; force intersection directly.
    # Here we verify that requesting CAMPUS while authorized to CITY is rejected.
    with pytest.raises(ToolForbidden):
        ToolRegistry().execute("sales_summary", {"outlet_codes": ["CAMPUS-ID"]}, context=context, principal_permissions={"analysis:run"})


def test_tool_permission_enforced():
    port = InMemoryToolDataPort([_row("CITY")])
    context = ToolContext(organization_id="org", outlet_ids=None, port=port, constraints=BusinessConstraints())
    with pytest.raises(ToolError):
        ToolRegistry().execute("sales_summary", {}, context=context, principal_permissions=set())


def test_revenue_calculator_is_dataless():
    port = InMemoryToolDataPort([])
    context = ToolContext(organization_id="org", outlet_ids=None, port=port, constraints=BusinessConstraints())
    out = ToolRegistry().execute(
        "revenue_calculator",
        {"units": 10, "unit_price": 100, "discount_pct": 10},
        context=context,
        principal_permissions={"analysis:run"},
    )
    assert out["result"]["net_revenue"] == 900.0


def test_data_quality_reports_missing_cost():
    rows = [_row("CITY", 10, 100, 0)]
    port = InMemoryToolDataPort(rows)
    context = ToolContext(organization_id="org", outlet_ids=None, port=port, constraints=BusinessConstraints())
    out = ToolRegistry().execute("data_quality", {}, context=context, principal_permissions={"data:read"})
    assert out["result"]["missing_cost_rows"] == 1
    assert out["result"]["ready"] is False


def test_constraint_validate_tool_runs_without_data():
    port = InMemoryToolDataPort([])
    context = ToolContext(organization_id="org", outlet_ids=None, port=port, constraints=BusinessConstraints(min_margin_pct=Decimal(40)))
    out = ToolRegistry().execute(
        "constraint_validate",
        {"discount_pct": 10, "resulting_margin_pct": 30, "promo_cost": 0, "data_ready": True},
        context=context,
        principal_permissions={"simulation:run"},
    )
    assert out["result"]["feasible"] is False  # margin 30 < 40
