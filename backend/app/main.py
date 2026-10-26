from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .workflows.state import Decision, WorkflowState, apply_decision

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


@app.post("/api/v1/workflows/decision", response_model=DecisionResponse)
def decision(request: DecisionRequest) -> DecisionResponse:
    try:
        next_state = apply_decision(request.state, request.decision, approved_by=request.approved_by, revision_parameters=request.revision_parameters)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return DecisionResponse(state=next_state, decision=request.decision, event_id="local-foundation-event", revision_parameters=request.revision_parameters)
