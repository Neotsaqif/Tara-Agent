from enum import StrEnum
from pydantic import BaseModel, Field, ConfigDict


class WorkflowRoute(StrEnum):
    AUTO = "auto"
    INFORMATIONAL = "informational"
    DIAGNOSTIC = "diagnostic"
    GOAL_DIRECTED = "goal_directed"


class AgentChatRequest(BaseModel):
    session_id: str | None = Field(default=None, min_length=1, max_length=128)
    message: str = Field(min_length=1, max_length=4000)
    workflow: WorkflowRoute = WorkflowRoute.AUTO


class AgentChatResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    session_id: str
    workflow: WorkflowRoute
    status: str
    answer: str
    evidence: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    needs_approval: bool = False
    available_actions: list[str] = Field(default_factory=list)
    provider: str


class ModelAnswer(BaseModel):
    answer: str
    evidence: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    needs_approval: bool = False
    available_actions: list[str] = Field(default_factory=list)
