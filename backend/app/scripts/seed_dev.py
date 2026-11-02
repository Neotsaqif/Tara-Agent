"""Development seed.

Creates the RBAC catalogue projection, a demo organization, outlets, demo
users, and a **clearly-labelled synthetic dataset**. Refuses to run in
production and requires ``TARA_ENABLE_DEV_SEED=true``.

Passwords: supplied via ``--password`` (or ``TARA_DEV_SEED_PASSWORD``) or
generated randomly. The generated password is printed **once** to the operator's
console; it is never written to logs, files, or the audit trail.

Usage (from repo root):
    $env:PYTHONPATH="backend"; python -m app.scripts.seed_dev --password "your-strong-password"
"""
from __future__ import annotations

import argparse
import os
import secrets
from datetime import timezone

from sqlalchemy import select

from ..auth.rbac import ROLE_PERMISSIONS, RoleName
from ..config import settings
from ..core.security import hash_password
from ..db.models import Dataset, Outlet, Product, SalesTransaction
from ..db.repositories import (
    DatasetRepository,
    MembershipRepository,
    OrganizationRepository,
    OutletRepository,
    RoleRepository,
    SalesRepository,
    UserRepository,
)
from ..db.session import session_scope
from .demo_data import DEMO_OUTLETS, DEMO_PRODUCTS, DEFAULT_DAYS, generate_rows

DEMO_USERS = [
    {"email": "admin@tara.local", "full_name": "Admin TARA", "role": RoleName.ADMIN, "outlets": None},
    {"email": "leader@tara.local", "full_name": "Pemilik Outlet", "role": RoleName.LEADER, "outlets": ["CITY", "CAMPUS"]},
    {"email": "analyst@tara.local", "full_name": "Analis Kota", "role": RoleName.ANALYST, "outlets": ["CITY"]},
]

DEMO_ORG = {"name": "TARA Demo F&B", "slug": "tara-demo"}


def _ensure_roles(db) -> dict[str, str]:  # noqa: ANN001
    """Create roles + permissions from the authoritative catalogue."""
    roles = RoleRepository(db)
    ids: dict[str, str] = {}
    for role_name, perms in ROLE_PERMISSIONS.items():
        role = roles.get_or_create(role_name.value, description=f"Role {role_name.value}")
        for code in perms:
            roles.grant(role, str(code))
        ids[role_name.value] = role.id
    return ids


def _seed_dataset(db, org_id: str, created_by: str, *, days: int) -> str:  # noqa: ANN001
    existing = db.scalar(select(Dataset).where(Dataset.organization_id == org_id, Dataset.source == "demo"))
    if existing is not None:
        return existing.id

    dataset = DatasetRepository(db).create(
        organization_id=org_id,
        name=f"Demo sintetis {days} hari (3 outlet × 5 produk)",
        source="demo",
        is_synthetic=True,
        created_by=created_by,
    )
    outlets: dict[str, Outlet] = {o.code: o for o in OutletRepository(db).list_for_org(org_id)}
    products_repo = __import__("app.db.repositories", fromlist=["ProductRepository"]).ProductRepository(db)
    product_map = {}
    for sku, name, category, price, cost in DEMO_PRODUCTS:
        product_map[sku] = products_repo.upsert(
            organization_id=org_id,
            sku=sku,
            name=name,
            category=category,
            unit_price=float(price),
            unit_cost=float(cost),
        )

    sales = SalesRepository(db)
    inserted = 0
    for row in generate_rows(days=days):
        outlet = outlets[row["outlet_code"]]
        product = product_map[row["sku"]]
        if sales.exists_external(org_id, row["external_id"]):
            continue
        qty = row["quantity"]
        line_rev = row["unit_price"] * qty - row["discount_amount"]
        line_cost = row["unit_cost"] * qty
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
                    "is_synthetic": True,
                }
            ]
        )
        inserted += 1
    dataset.row_count = inserted
    return dataset.id


def seed_dev(password: str | None = None, *, days: int = DEFAULT_DAYS) -> dict[str, str]:
    if settings.is_production:
        raise RuntimeError("Refusing to seed development data in production.")
    if not settings.tara_enable_dev_seed:
        raise RuntimeError("TARA_ENABLE_DEV_SEED must be true to seed development data.")
    if password is not None and len(password) < settings.tara_password_min_length:
        raise RuntimeError(f"Password minimal {settings.tara_password_min_length} karakter.")
    if password is not None and len(password.encode("utf-8")) > 72:
        raise RuntimeError("Password maksimal 72 byte (batas bcrypt).")

    generated = password is None
    effective_password = password or ("Dev-" + secrets.token_urlsafe(12) + "!9")
    created: dict[str, str] = {}

    with session_scope() as db:
        role_ids = _ensure_roles(db)
        orgs = OrganizationRepository(db)
        org = orgs.by_slug(DEMO_ORG["slug"]) or orgs.add(name=DEMO_ORG["name"], slug=DEMO_ORG["slug"])

        outlets = OutletRepository(db)
        outlet_map: dict[str, str] = {}
        existing_outlets = {o.code: o for o in outlets.list_for_org(org.id)}
        for outlet_def in DEMO_OUTLETS:
            outlet = existing_outlets.get(outlet_def["code"]) or outlets.add(
                organization_id=org.id,
                code=outlet_def["code"],
                name=outlet_def["name"],
                city=outlet_def["city"],
                latitude=outlet_def["latitude"],
                longitude=outlet_def["longitude"],
            )
            outlet_map[outlet_def["code"]] = outlet.id

        users = UserRepository(db)
        members = MembershipRepository(db)
        for spec in DEMO_USERS:
            user = users.by_email(spec["email"])
            if user is None:
                user = users.add(
                    email=spec["email"],
                    full_name=spec["full_name"],
                    password_hash=hash_password(effective_password),
                )
            # Ensure membership exists (idempotent).
            existing = {m.organization_id for m in members.by_user(user.id)}
            if org.id not in existing:
                members.add(user_id=user.id, organization_id=org.id, role_id=role_ids[spec["role"].value])
            scope = spec["outlets"] or list(outlet_map.keys())
            for code in scope:
                members.grant_outlet(user_id=user.id, outlet_id=outlet_map[code])
            created[spec["email"]] = spec["role"].value

        admin = users.by_email("admin@tara.local")
        _seed_dataset(db, org.id, admin.id if admin else "", days=days)

    return {
        "organization": DEMO_ORG["slug"],
        "outlets": ", ".join(o["code"] for o in DEMO_OUTLETS),
        "users": ", ".join(created.keys()),
        "password": effective_password if generated else "(dari argumen, tidak dicetak)",
        "generated": "yes" if generated else "no",
    }


def main() -> None:  # pragma: no cover
    parser = argparse.ArgumentParser(description="Seed TARA AGENT development data")
    parser.add_argument("--password", default=os.environ.get("TARA_DEV_SEED_PASSWORD"))
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS)
    args = parser.parse_args()
    result = seed_dev(args.password, days=args.days)
    print("Seeded organization:", result["organization"])
    print("Outlets:", result["outlets"])
    print("Users:", result["users"])
    if result["generated"] == "yes":
        print(">>> DEV PASSWORD (printed once — store securely, rotate for shared environments):", result["password"])
    else:
        print("Password: supplied via argument (not printed).")
    print("Login with admin@tara.local / leader@tara.local / analyst@tara.local")


if __name__ == "__main__":  # pragma: no cover
    main()
