from dataclasses import dataclass, field
from enum import StrEnum


class Decision(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    REVISE = "revise"


class WorkflowKind(StrEnum):
    INFORMATIONAL = "informational"
    DIAGNOSTIC = "diagnostic"
    GOAL_DIRECTED = "goal_directed"


class WorkflowState(StrEnum):
    DIAGNOSING = "diagnosing"
    OPTIONS_PRESENTED = "options_presented"
    PENDING_APPROVAL = "pending_approval"
    REEXECUTING = "reexecuting"
    REVISION_REQUESTED = "revision_requested"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    CLOSED = "closed"


@dataclass(frozen=True)
class WorkflowEvent:
    event_id: str
    workflow: WorkflowKind
    state: WorkflowState
    decision: Decision | None = None
    revision_parameters: dict[str, str] = field(default_factory=dict)


def apply_decision(
    state: WorkflowState,
    decision: Decision,
    *,
    approved_by: str | None = None,
    revision_parameters: dict[str, str] | None = None,
) -> WorkflowState:
    if state != WorkflowState.PENDING_APPROVAL:
        raise ValueError("decision requires pending_approval state")
    if decision == Decision.APPROVE:
        if not approved_by:
            raise PermissionError("approved_by is required for approve")
        return WorkflowState.EXECUTING
    if decision == Decision.REJECT:
        return WorkflowState.REEXECUTING
    if decision == Decision.REVISE:
        if not revision_parameters:
            raise ValueError("revision_parameters are required for revise")
        return WorkflowState.REVISION_REQUESTED
    raise ValueError("unsupported decision")
