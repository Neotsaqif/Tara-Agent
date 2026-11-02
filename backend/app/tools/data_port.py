"""Database-backed implementation of the business-tool data port.

Reads sales transactions and products from SQLAlchemy and converts them into
the frozen Decimal-based dataclasses the tools consume. Every query is scoped
to ``organization_id``; outlet lists are the *already validated* intersection
computed by the tool layer.

Timezone note: SQLite returns naive datetimes for ``DateTime(timezone=True)``.
All persisted timestamps are UTC, so naive values are treated as UTC to keep
date filtering identical between SQLite and PostgreSQL. This avoids the common
``can't compare offset-naive and offset-aware`` runtime error.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import Outlet, Product, SalesTransaction
from .business import SalesRow


def json_safe(value):
    """Recursively convert Decimal/datetime/enum to JSON-serializable values.

    SQLAlchemy JSON columns reject ``Decimal`` objects. Simulation inputs and
    scenario outputs are stored as JSON, so they must pass through this helper.
    """
    from dataclasses import asdict, is_dataclass
    from datetime import date, datetime
    from decimal import Decimal
    from enum import Enum

    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(v) for v in value]
    if is_dataclass(value) and not isinstance(value, type):
        return json_safe(asdict(value))
    return value


def as_utc(value: datetime | None) -> datetime | None:
    """Treat naive datetimes as UTC (SQLite) and convert aware ones to UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class DatabaseToolDataPort:
    def __init__(self, db: Session) -> None:
        self.db = db

    def resolve_outlet_codes(self, *, organization_id: str, outlet_codes: list[str]) -> list[str]:
        """Map user-supplied outlet codes *or* ids to outlet ids inside the org.

        Unknown codes are silently dropped here; the caller compares lengths to
        detect and reject unknown references.
        """
        if not outlet_codes:
            return []
        wanted = {str(code) for code in outlet_codes}
        outlets = self.db.scalars(select(Outlet).where(Outlet.organization_id == organization_id)).all()
        resolved: list[str] = []
        for outlet in outlets:
            if outlet.id in wanted or outlet.code in wanted:
                resolved.append(outlet.id)
        return resolved

    def load_sales(
        self,
        *,
        organization_id: str,
        outlet_codes: list[str] | None,
        start: datetime | None,
        end: datetime | None,
    ) -> list[SalesRow]:
        outlet_ids: list[str] | None = None
        if outlet_codes is not None:
            if not outlet_codes:
                # Explicitly empty scope means "nothing" — never "everything".
                return []
            outlet_ids = list(outlet_codes)

        stmt = (
            select(SalesTransaction, Outlet.code, Product.sku, Product.name)
            .join(Outlet, Outlet.id == SalesTransaction.outlet_id)
            .outerjoin(Product, Product.id == SalesTransaction.product_id)
            .where(SalesTransaction.organization_id == organization_id)
        )
        start_utc = as_utc(start)
        end_utc = as_utc(end)
        if start_utc is not None:
            stmt = stmt.where(SalesTransaction.transaction_date >= start_utc)
        if end_utc is not None:
            stmt = stmt.where(SalesTransaction.transaction_date <= end_utc)
        if outlet_ids is not None:
            stmt = stmt.where(SalesTransaction.outlet_id.in_(outlet_ids))

        rows: list[SalesRow] = []
        for tx, outlet_code, sku, product_name in self.db.execute(stmt).all():
            if tx.quantity is None or tx.quantity <= 0:
                continue
            rows.append(
                SalesRow(
                    outlet_code=outlet_code or tx.outlet_id,
                    product_sku=sku or (tx.product_id or "UNKNOWN"),
                    product_name=product_name or "Produk tidak dikenal",
                    quantity=int(tx.quantity),
                    unit_price=Decimal(str(tx.unit_price)),
                    unit_cost=Decimal(str(tx.unit_cost)),
                    discount_amount=Decimal(str(tx.discount_amount or 0)),
                    transaction_date=as_utc(tx.transaction_date) or datetime.now(timezone.utc),
                )
            )
        return rows

    def load_products(self, *, organization_id: str) -> dict[str, dict]:
        products = self.db.scalars(select(Product).where(Product.organization_id == organization_id)).all()
        return {
            p.sku: {
                "name": p.name,
                "category": p.category,
                "price": Decimal(str(p.unit_price)),
                "cost": Decimal(str(p.unit_cost)),
            }
            for p in products
        }
