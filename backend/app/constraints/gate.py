"""Hard constraint gate.

The LLM cannot bypass these checks: every proposed scenario passes through
:func:`evaluate_scenario` before it can be shown as feasible, persisted, or
approved. All inputs are Decimal; the gate never mutates them.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from ..config import settings

ZERO = Decimal("0")
HUNDRED = Decimal("100")


@dataclass(frozen=True)
class ConstraintViolation:
    code: str
    message: str
    actual: float | None = None
    limit: float | None = None


@dataclass(frozen=True)
class ConstraintResult:
    feasible: bool
    violations: tuple[ConstraintViolation, ...] = ()
    warnings: tuple[str, ...] = ()

    @property
    def reasons(self) -> tuple[str, ...]:
        return tuple(v.message for v in self.violations)

    @property
    def codes(self) -> tuple[str, ...]:
        return tuple(v.code for v in self.violations)


def evaluate_constraints(*, budget: float, required_budget: float, margin: float, minimum_margin: float) -> ConstraintResult:
    """Backward-compatible simple gate (kept for existing callers/tests)."""
    violations: list[ConstraintViolation] = []
    if budget < required_budget:
        violations.append(ConstraintViolation("budget", "budget constraint violated", budget, required_budget))
    if margin < minimum_margin:
        violations.append(ConstraintViolation("minimum_margin", "minimum margin constraint violated", margin, minimum_margin))
    return ConstraintResult(not violations, tuple(violations))


@dataclass(frozen=True)
class BusinessConstraints:
    """Hard limits applied to every promo scenario.

    Defaults come from settings so a deployment can tighten them without code
    changes. ``max_promo_cost`` / ``max_daily_discount`` are optional extra
    limits supplied per organization.
    """

    max_discount_pct: Decimal = Decimal(str(settings.tara_max_discount_pct))
    min_margin_pct: Decimal = Decimal(str(settings.tara_min_margin_pct))
    promo_budget: Decimal = Decimal(str(settings.tara_promo_budget))
    max_promo_cost: Decimal | None = None
    max_daily_discount: Decimal | None = None
    max_volume_uplift_pct: Decimal = Decimal(str(settings.tara_max_volume_uplift_pct))

    def as_dict(self) -> dict[str, float | None]:
        return {
            "max_discount_pct": float(self.max_discount_pct),
            "min_margin_pct": float(self.min_margin_pct),
            "promo_budget": float(self.promo_budget),
            "max_promo_cost": float(self.max_promo_cost) if self.max_promo_cost is not None else None,
            "max_daily_discount": float(self.max_daily_discount) if self.max_daily_discount is not None else None,
            "max_volume_uplift_pct": float(self.max_volume_uplift_pct),
        }


def validate_scenario_inputs(
    *,
    discount_pct: Decimal,
    volume_uplift_pct: Decimal,
    period_days: int,
    constraints: BusinessConstraints,
) -> tuple[ConstraintViolation, ...]:
    """Domain validation independent from the resulting margins.

    Returns violations; an empty tuple means the raw inputs are acceptable.
    """
    violations: list[ConstraintViolation] = []
    if discount_pct < ZERO or discount_pct > HUNDRED:
        violations.append(
            ConstraintViolation("discount_range", "Diskon harus berada pada 0–100%.", float(discount_pct), 100.0)
        )
    if volume_uplift_pct < ZERO:
        violations.append(
            ConstraintViolation("uplift_negative", "Kenaikan volume tidak boleh negatif.", float(volume_uplift_pct), 0.0)
        )
    if volume_uplift_pct > constraints.max_volume_uplift_pct:
        violations.append(
            ConstraintViolation(
                "uplift_unrealistic",
                f"Kenaikan volume {volume_uplift_pct}% tidak realistis (maks {constraints.max_volume_uplift_pct}%).",
                float(volume_uplift_pct),
                float(constraints.max_volume_uplift_pct),
            )
        )
    if period_days <= 0:
        violations.append(ConstraintViolation("period_invalid", "Periode simulasi harus lebih dari 0 hari.", float(period_days), 1.0))
    if period_days > 366:
        violations.append(ConstraintViolation("period_too_long", "Periode simulasi maksimum 366 hari.", float(period_days), 366.0))
    return tuple(violations)


def evaluate_scenario(
    *,
    discount_pct: Decimal,
    resulting_margin_pct: Decimal,
    promo_cost: Decimal,
    constraints: BusinessConstraints,
    data_ready: bool = True,
    volume_uplift_pct: Decimal | None = None,
    period_days: int | None = None,
) -> ConstraintResult:
    """Full deterministic constraint evaluation for a promo scenario."""
    violations: list[ConstraintViolation] = []

    if not data_ready:
        violations.append(ConstraintViolation("data_ready", "Data tidak siap: dataset periode belum lengkap."))

    if discount_pct < ZERO or discount_pct > HUNDRED:
        violations.append(
            ConstraintViolation("discount_range", "Diskon harus berada pada 0–100%.", float(discount_pct), 100.0)
        )
    if discount_pct > constraints.max_discount_pct:
        violations.append(
            ConstraintViolation(
                "max_discount",
                f"Diskon {discount_pct}% melebihi batas {constraints.max_discount_pct}%.",
                float(discount_pct),
                float(constraints.max_discount_pct),
            )
        )

    if resulting_margin_pct < constraints.min_margin_pct:
        violations.append(
            ConstraintViolation(
                "min_margin",
                f"Margin {resulting_margin_pct}% di bawah minimum {constraints.min_margin_pct}%.",
                float(resulting_margin_pct),
                float(constraints.min_margin_pct),
            )
        )

    if promo_cost < ZERO:
        violations.append(ConstraintViolation("promo_cost_negative", "Biaya promo tidak boleh negatif.", float(promo_cost), 0.0))
    elif promo_cost > constraints.promo_budget:
        violations.append(
            ConstraintViolation("promo_budget", "Biaya promo melebihi anggaran.", float(promo_cost), float(constraints.promo_budget))
        )

    if constraints.max_promo_cost is not None and promo_cost > constraints.max_promo_cost:
        violations.append(
            ConstraintViolation("max_promo_cost", "Biaya promo melebihi batas biaya.", float(promo_cost), float(constraints.max_promo_cost))
        )

    if volume_uplift_pct is not None:
        if volume_uplift_pct < ZERO:
            violations.append(ConstraintViolation("uplift_negative", "Kenaikan volume tidak boleh negatif.", float(volume_uplift_pct), 0.0))
        elif volume_uplift_pct > constraints.max_volume_uplift_pct:
            violations.append(
                ConstraintViolation(
                    "uplift_unrealistic",
                    f"Kenaikan volume {volume_uplift_pct}% tidak realistis (maks {constraints.max_volume_uplift_pct}%).",
                    float(volume_uplift_pct),
                    float(constraints.max_volume_uplift_pct),
                )
            )

    if period_days is not None and period_days <= 0:
        violations.append(ConstraintViolation("period_invalid", "Periode simulasi harus lebih dari 0 hari.", float(period_days), 1.0))

    warnings: list[str] = []
    if constraints.max_discount_pct > ZERO and discount_pct >= constraints.max_discount_pct * Decimal("0.9"):
        warnings.append("Diskon mendekati batas maksimum.")
    if resulting_margin_pct < constraints.min_margin_pct + Decimal("5"):
        warnings.append("Margin hanya sedikit di atas batas minimum.")

    return ConstraintResult(not violations, tuple(violations), tuple(warnings))
