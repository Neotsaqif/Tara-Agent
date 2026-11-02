"""Pydantic schemas for the agent chat contract."""
from __future__ import annotations

import re
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkflowRoute(StrEnum):
    AUTO = "auto"
    INFORMATIONAL = "informational"
    DIAGNOSTIC = "diagnostic"
    GOAL_DIRECTED = "goal_directed"


class ChatStatus(StrEnum):
    COMPLETED = "completed"
    INSUFFICIENT_DATA = "insufficient_data"
    PROVIDER_ERROR = "provider_error"
    BLOCKED = "blocked"


class AgentChatRequest(BaseModel):
    conversation_id: str | None = Field(default=None, min_length=1, max_length=64)
    session_id: str | None = Field(default=None, min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=4000)
    workflow: WorkflowRoute = WorkflowRoute.AUTO
    outlet_id: str | None = Field(default=None, max_length=64)

    @field_validator("message")
    @classmethod
    def _clean_message(cls, value: str) -> str:
        cleaned = sanitize_text(value)
        if not cleaned:
            raise ValueError("Pertanyaan tidak boleh kosong.")
        return cleaned

    @property
    def resolved_conversation_id(self) -> str | None:
        """Accept both ``conversation_id`` and the legacy ``session_id`` field."""
        return self.conversation_id or self.session_id


class RoutingMeta(BaseModel):
    method: str  # explicit | contextual | deterministic
    previous_workflow: str | None = None
    followup_detected: bool = False
    matched_signals: list[str] = Field(default_factory=list)
    reason: str = ""


class ToolRun(BaseModel):
    tool: str
    status: str  # ok | unavailable | error | skipped
    result: dict | None = None
    error: str | None = None


class EvidenceItem(BaseModel):
    """Structured provenance for a computed figure."""

    source: str
    detail: str
    value: str | None = None
    as_of: str | None = None


class AgentChatResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    conversation_id: str
    session_id: str
    workflow: WorkflowRoute
    status: ChatStatus
    routing: RoutingMeta
    answer: str
    evidence: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    tools: list[ToolRun] = Field(default_factory=list)
    needs_approval: bool = False
    available_actions: list[str] = Field(default_factory=list)
    provider: str
    model: str | None = None
    message_id: str | None = None
    demo: bool = False


class ModelAnswer(BaseModel):
    """Structured output requested from the LLM.

    ``answer`` is free text; every other field is advisory and is *validated*
    against deterministic data by the AgentCore before being returned.
    """

    answer: str = Field(min_length=1, max_length=6000)
    evidence: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    needs_approval: bool = False
    available_actions: list[str] = Field(default_factory=list)


class RoutingChoice(BaseModel):
    """Optional LLM-assisted tool choice, constrained by an allow-list."""

    tool: str | None = None
    reason: str = ""


_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_text(text: str) -> str:
    """Strip control characters (except newline/tab) and collapse extremes."""
    text = _CONTROL_CHARS.sub("", text or "")
    return text.strip()
