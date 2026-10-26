from decimal import Decimal
from io import StringIO
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

import pytest
from fastapi.testclient import TestClient
from app.analytics.metrics import margin, revenue
from app.constraints.gate import evaluate_constraints
from app.data_ingestion.csv_validation import validate_sales_csv
from app.main import app
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


def test_decision_transitions_are_distinct():
    assert apply_decision(WorkflowState.PENDING_APPROVAL, Decision.APPROVE, approved_by="manager") == WorkflowState.EXECUTING
    assert apply_decision(WorkflowState.PENDING_APPROVAL, Decision.REJECT) == WorkflowState.REEXECUTING
    assert apply_decision(WorkflowState.PENDING_APPROVAL, Decision.REVISE, revision_parameters={"budget": "100"}) == WorkflowState.REVISION_REQUESTED


def test_decision_requires_approval_or_revision_data():
    with pytest.raises(PermissionError):
        apply_decision(WorkflowState.PENDING_APPROVAL, Decision.APPROVE)
    with pytest.raises(ValueError):
        apply_decision(WorkflowState.PENDING_APPROVAL, Decision.REVISE)


def test_csv_quarantines_invalid_rows():
    report = validate_sales_csv(StringIO("outlet_id,transaction_date,quantity,unit_price\nA,2026-01-01,2,10.50\nA,2026-01-02,-1,10\n"), "dataset-1")
    assert len(report.valid_rows) == 1
    assert len(report.invalid_rows) == 1


def test_api_returns_explicit_http_errors():
    client = TestClient(app)
    assert client.get("/api/v1/health").status_code == 200
    assert client.post("/api/v1/workflows/decision", json={"state": "pending_approval", "decision": "approve"}).status_code == 403
    assert client.post("/api/v1/workflows/decision", json={"state": "pending_approval", "decision": "revise"}).status_code == 409
