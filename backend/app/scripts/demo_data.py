"""Synthetic demo dataset generator.

Generates a clearly-labelled, reproducible synthetic F&B sales dataset for
30 days × 3 outlets × 5 products. It is *always* stored with
``is_synthetic=True`` and surfaced in the UI with a visible label so it can
never be confused with real business data.

The generator is deterministic (seeded RNG) so tests can assert exact figures.
"""
from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

DEMO_PRODUCTS = [
    # sku, name, category, unit_price, unit_cost
    ("KP-001", "Kopi Susu Gula Aren", "Minuman", Decimal("22000"), Decimal("8500")),
    ("KP-002", "Americano", "Minuman", Decimal("18000"), Decimal("5000")),
    ("MT-003", "Matcha Latte", "Minuman", Decimal("27000"), Decimal("11000")),
    ("PS-004", "Croissant Butter", "Pastri", Decimal("25000"), Decimal("12000")),
    ("PS-005", "Cinnamon Roll", "Pastri", Decimal("23000"), Decimal("10000")),
]

DEMO_OUTLETS = [
    {"code": "CITY", "name": "Pusat Kota", "city": "Purwokerto", "latitude": -7.4245, "longitude": 109.2297, "weight": 1.25},
    {"code": "CAMPUS", "name": "Kampus", "city": "Purwokerto", "latitude": -7.4417, "longitude": 109.2510, "weight": 1.0},
    {"code": "RIVERSIDE", "name": "Riverside", "city": "Purwokerto", "latitude": -7.4330, "longitude": 109.2450, "weight": 0.8},
]

DEFAULT_DAYS = 30
DEFAULT_SEED = 20260201


def generate_rows(days: int = DEFAULT_DAYS, seed: int = DEFAULT_SEED, end_date: date | None = None) -> list[dict]:
    """Return normalized synthetic rows with Decimal money values.

    Each row mirrors a real sales line: one product on one day in one outlet.
    Daily quantity is drawn around a per-outlet/product baseline with weekday
    seasonality (weekends ~35% higher), then split into a handful of tickets.
    """
    rng = random.Random(seed)
    last_day = end_date or date.today()
    rows: list[dict] = []
    for offset in range(days):
        day = last_day - timedelta(days=days - 1 - offset)
        weekend_factor = Decimal("1.35") if day.weekday() >= 5 else Decimal("1.0")
        for outlet in DEMO_OUTLETS:
            for sku, name, category, price, cost in DEMO_PRODUCTS:
                base_qty = {
                    "KP-001": 26,
                    "KP-002": 15,
                    "MT-003": 9,
                    "PS-004": 7,
                    "PS-005": 6,
                }[sku]
                jitter = Decimal(str(round(rng.uniform(0.75, 1.25), 3)))
                quantity = int(float(Decimal(base_qty) * Decimal(str(outlet["weight"])) * weekend_factor * jitter))
                if quantity <= 0:
                    continue
                # Split quantity into 1-3 transaction lines to exercise grouping.
                remaining = quantity
                parts = min(3, max(1, quantity // 8))
                for part in range(parts):
                    qty = remaining if part == parts - 1 else max(1, remaining // (parts - part))
                    remaining -= qty
                    if remaining < 0:
                        break
                    line_discount = Decimal("0")
                    if day.weekday() == 4 and sku.startswith("PS"):
                        line_discount = (price * Decimal(qty) * Decimal("0.10")).quantize(Decimal("0.01"))
                    rows.append(
                        {
                            "outlet_code": outlet["code"],
                            "sku": sku,
                            "product_name": name,
                            "category": category,
                            "quantity": qty,
                            "unit_price": price,
                            "unit_cost": cost,
                            "discount_amount": line_discount,
                            "transaction_date": datetime.combine(day, time(hour=12, tzinfo=timezone.utc)),
                            "external_id": f"DEMO-{outlet['code']}-{sku}-{day.isoformat()}-{part}",
                        }
                    )
                    if remaining <= 0:
                        break
    return rows


def generate_csv(days: int = DEFAULT_DAYS, seed: int = DEFAULT_SEED) -> str:
    """Render the synthetic dataset as CSV matching the import template."""
    header = "outlet_code,sku,product_name,category,transaction_date,quantity,unit_price,unit_cost,discount_amount,external_id"
    lines = [header]
    for row in generate_rows(days=days, seed=seed):
        lines.append(
            ",".join(
                [
                    row["outlet_code"],
                    row["sku"],
                    row["product_name"],
                    row["category"],
                    row["transaction_date"].date().isoformat(),
                    str(row["quantity"]),
                    str(row["unit_price"]),
                    str(row["unit_cost"]),
                    str(row["discount_amount"]),
                    row["external_id"],
                ]
            )
        )
    return "\n".join(lines) + "\n"
