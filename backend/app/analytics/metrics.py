from decimal import Decimal


def revenue(units: int, unit_price: Decimal) -> Decimal:
    if units < 0 or unit_price < 0:
        raise ValueError("units and unit_price must be non-negative")
    return Decimal(units) * unit_price


def margin(revenue_amount: Decimal, cost_amount: Decimal) -> Decimal:
    if revenue_amount < 0 or cost_amount < 0:
        raise ValueError("revenue and cost must be non-negative")
    if cost_amount > revenue_amount:
        raise ValueError("cost cannot exceed revenue")
    return revenue_amount - cost_amount
