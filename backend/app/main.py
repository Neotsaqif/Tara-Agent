from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .agent.core import AgentCore
from .agent.provider import MockProvider, ProviderError
from .agent.schemas import AgentChatRequest, AgentChatResponse
from .workflows.state import Decision, WorkflowState, apply_decision


def build_agent_core() -> AgentCore:
    if settings.llm_provider == "gemini":
        from .agent.gemini_provider import GeminiProvider
        provider = GeminiProvider(settings.llm_api_key, settings.llm_model, settings.llm_timeout_seconds)
    else:
        provider = MockProvider()
    return AgentCore(provider)


agent_core = build_agent_core()

app = FastAPI(title="TARA AGENT API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",")], allow_methods=["*"], allow_headers=["*"])


class DecisionRequest(BaseModel):
    state: WorkflowState
    decision: Decision
    approved_by: str | None = Field(default=None, min_length=1)
    revision_parameters: dict[str, str] = Field(default_factory=dict)


class DecisionResponse(BaseModel):
    state: WorkflowState
    decision: Decision
    event_id: str
    revision_parameters: dict[str, str]


@app.get("/health")
@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@app.get("/api/v1/agent/status")
def agent_status() -> dict[str, str]:
    return {"provider": agent_core.provider.name, "model": settings.llm_model if agent_core.provider.name == "gemini" else "mock"}


@app.post("/api/v1/agent/chat", response_model=AgentChatResponse)
def agent_chat(request: AgentChatRequest) -> AgentChatResponse:
    try:
        return agent_core.process(request)
    except ProviderError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=502, detail="AI response format was invalid") from error


@app.post("/api/v1/workflows/decision", response_model=DecisionResponse)
def decision(request: DecisionRequest) -> DecisionResponse:
    try:
        next_state = apply_decision(request.state, request.decision, approved_by=request.approved_by, revision_parameters=request.revision_parameters)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return DecisionResponse(state=next_state, decision=request.decision, event_id="local-foundation-event", revision_parameters=request.revision_parameters)
