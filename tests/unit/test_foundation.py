from decimal import Decimal
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

import pytest
from app.analytics.metrics import margin, revenue
from app.constraints.gate import evaluate_constraints
from app.workflows.state import Decision, WorkflowState, apply_decision


def test_metrics_are_deterministic():
    assert revenue(3, Decimal("10.00")) == Decimal("30.00")
    assert margin(Decimal("30"), Decimal("12")) == Decimal("18")


def test_invalid_metrics_rejected():
    with pytest.raises(ValueError):
        revenue(-1, Decimal("10"))


def test_constraint_gate_rejects_violation():
    result = evaluate_constraints(budget=5, required_budget=10, margin=2, minimum_margin=3)
    assert not result.feasible and len(result.reasons) == 2


def test_decision_transitions():
    assert apply_decision(WorkflowState.PENDING_APPROVAL, Decision.APPROVE) == WorkflowState.EXECUTING
    assert apply_decision(WorkflowState.PENDING_APPROVAL, Decision.REJECT) == WorkflowState.DIAGNOSING
    assert apply_decision(WorkflowState.PENDING_APPROVAL, Decision.REVISE) == WorkflowState.DIAGNOSING


def test_decision_requires_approval_state():
    with pytest.raises(ValueError):
        apply_decision(WorkflowState.DIAGNOSING, Decision.APPROVE)
