"""Deterministic financial calculations.

Every business number is computed here with ``Decimal`` — never by the LLM.
Pure functions, explicit validation, no I/O, consistent rounding
(``ROUND_HALF_UP`` at 2 decimal places for money and percentages).
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

MONEY = Decimal("0.01")
PCT = Decimal("0.01")
HUNDRED = Decimal(100)


def to_decimal(value: Decimal | int | float | str) -> Decimal:
    """Convert an input to Decimal without binary float noise.

    Floats are converted via ``str`` so ``0.1`` becomes ``Decimal('0.1')`` rather
    than the binary expansion.
    """
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):  # bool is an int subclass; reject it explicitly
        raise ValueError("boolean is not a valid financial value")
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, float):
        return Decimal(repr(value))
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError("empty string is not a valid financial value")
        return Decimal(text)
    raise ValueError(f"unsupported numeric type: {type(value).__name__}")


def _q(value: Decimal, quantum: Decimal = MONEY) -> Decimal:
    return value.quantize(quantum, rounding=ROUND_HALF_UP)


def revenue(units: int, unit_price: Decimal) -> Decimal:
    if units < 0:
        raise ValueError("units must be non-negative")
    if unit_price < 0:
        raise ValueError("unit_price must be non-negative")
    return _q(Decimal(units) * unit_price)


def cost_total(units: int, unit_cost: Decimal) -> Decimal:
    if units < 0 or unit_cost < 0:
        raise ValueError("units and unit_cost must be non-negative")
    return _q(Decimal(units) * unit_cost)


def gross_profit(revenue_amount: Decimal, cost_amount: Decimal) -> Decimal:
    """``revenue - cost``. Negative results are preserved (loss-making period)."""
    if revenue_amount < 0 or cost_amount < 0:
        raise ValueError("revenue and cost must be non-negative")
    return _q(revenue_amount - cost_amount)


def margin(revenue_amount: Decimal, cost_amount: Decimal) -> Decimal:
    """Absolute gross profit (revenue - cost). Negative when cost exceeds revenue."""
    return gross_profit(revenue_amount, cost_amount)


def margin_pct(revenue_amount: Decimal, gross_profit_amount: Decimal) -> Decimal:
    """Gross margin percentage = gross_profit / revenue * 100.

    Returns ``0`` when revenue is zero (undefined ratio, documented behaviour).
    Negative gross profit yields a negative margin — it is *never* clamped to 0.
    """
    if revenue_amount < 0:
        raise ValueError("revenue must be non-negative")
    if revenue_amount == 0:
        return Decimal("0.00")
    return _q(gross_profit_amount / revenue_amount * HUNDRED, PCT)


def discount_amount(gross_value: Decimal, discount_pct: Decimal) -> Decimal:
    """Absolute rupiah discount from a gross value and a 0-100 percentage."""
    if gross_value < 0:
        raise ValueError("gross_value must be non-negative")
    if discount_pct < 0 or discount_pct > HUNDRED:
        raise ValueError("discount_pct must be between 0 and 100")
    return _q(gross_value * discount_pct / HUNDRED, MONEY)


def variance(actual: Decimal, baseline: Decimal) -> tuple[Decimal, Decimal]:
    """Return (absolute variance, percentage variance). Baseline must be > 0."""
    if baseline <= 0:
        raise ValueError("baseline must be positive to compute variance")
    diff = _q(actual - baseline)
    pct = _q(diff / baseline * HUNDRED, PCT)
    return diff, pct


@dataclass(frozen=True)
class SalesSummary:
    transactions: int
    units: int
    revenue: Decimal
    gross_profit: Decimal
    gross_margin_pct: Decimal
    average_order_value: Decimal
    discount_total: Decimal = Decimal("0.00")


def summarize(rows: list[dict]) -> SalesSummary:
    """Aggregate normalized sales rows deterministically.

    Each row is a dict with keys: ``quantity`` (int), ``unit_price``,
    ``unit_cost``, optionally ``discount_amount``.

    Formulas (documented contract):
      line_gross  = quantity * unit_price
      line_rev    = line_gross - discount_amount
      line_cost   = quantity * unit_cost
      revenue     = sum(line_rev)
      gross_profit= revenue - sum(line_cost)
      gross_margin= gross_profit / revenue * 100
      AOV         = revenue / number_of_transactions
    """
    if not rows:
        raise ValueError("no rows to summarize")
    total_revenue = Decimal("0")
    total_cost = Decimal("0")
    total_discount = Decimal("0")
    units = 0
    for index, row in enumerate(rows):
        try:
            qty = int(row["quantity"])
            price = to_decimal(row["unit_price"])
            cost = to_decimal(row["unit_cost"])
            discount = to_decimal(row.get("discount_amount", 0) or 0)
        except (KeyError, TypeError, ArithmeticError) as exc:
            raise ValueError(f"row {index}: nilai penjualan tidak valid") from exc
        if qty < 0 or price < 0 or cost < 0 or discount < 0:
            raise ValueError(f"row {index}: nilai negatif tidak diizinkan")
        line_gross = Decimal(qty) * price
        line_rev = _q(line_gross - discount)
        if line_rev < 0:
            raise ValueError(f"row {index}: diskon melebihi nilai penjualan")
        units += qty
        total_revenue += line_rev
        total_cost += _q(Decimal(qty) * cost)
        total_discount += discount
    total_revenue = _q(total_revenue)
    total_cost = _q(total_cost)
    gp = _q(total_revenue - total_cost)
    gm = margin_pct(total_revenue, gp)
    aov = _q(total_revenue / Decimal(len(rows))) if len(rows) else Decimal("0.00")
    return SalesSummary(
        transactions=len(rows),
        units=units,
        revenue=total_revenue,
        gross_profit=gp,
        gross_margin_pct=gm,
        average_order_value=aov,
        discount_total=_q(total_discount),
    )
