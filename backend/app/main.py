from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .workflows.state import Decision, WorkflowState, apply_decision

app = FastAPI(title="TARA AGENT API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",")], allow_methods=["*"], allow_headers=["*"])


class DecisionRequest(BaseModel):
    state: WorkflowState
    decision: Decision
    approved_by: str | None = Field(default=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@app.post("/api/v1/workflows/decision")
def decision(request: DecisionRequest) -> dict[str, str]:
    if request.decision == Decision.APPROVE and not request.approved_by:
        raise ValueError("approved_by is required for approve")
    return {"state": apply_decision(request.state, request.decision).value}
