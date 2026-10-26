from dataclasses import dataclass


@dataclass(frozen=True)
class ConstraintResult:
    feasible: bool
    reasons: tuple[str, ...] = ()


def evaluate_constraints(*, budget: float, required_budget: float, margin: float, minimum_margin: float) -> ConstraintResult:
    reasons: list[str] = []
    if budget < required_budget:
        reasons.append("budget constraint violated")
    if margin < minimum_margin:
        reasons.append("minimum margin constraint violated")
    return ConstraintResult(not reasons, tuple(reasons))
