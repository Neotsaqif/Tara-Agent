from enum import StrEnum


class Decision(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    REVISE = "revise"


class WorkflowState(StrEnum):
    DIAGNOSING = "diagnosing"
    OPTIONS_PRESENTED = "options_presented"
    PENDING_APPROVAL = "pending_approval"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    CLOSED = "closed"


def apply_decision(state: WorkflowState, decision: Decision) -> WorkflowState:
    if state != WorkflowState.PENDING_APPROVAL:
        raise ValueError("decision requires pending_approval state")
    if decision == Decision.APPROVE:
        return WorkflowState.EXECUTING
    if decision in (Decision.REJECT, Decision.REVISE):
        return WorkflowState.DIAGNOSING
    raise ValueError("unsupported decision")
