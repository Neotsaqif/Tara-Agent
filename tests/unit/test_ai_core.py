import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

from fastapi.testclient import TestClient
from app.agent.core import AgentCore
from app.agent.context_manager import InMemoryContextManager
from app.agent.provider import MockProvider, ProviderError
from app.agent.schemas import AgentChatRequest, WorkflowRoute
from app.main import app


def test_mock_chat_and_routing_without_key():
    result = AgentCore(MockProvider()).process(AgentChatRequest(message="Mengapa omzet outlet A turun?"))
    assert result.workflow == WorkflowRoute.DIAGNOSTIC
    assert result.provider == "mock"
    assert result.limitations
    assert not result.evidence


def test_sessions_are_isolated():
    context = InMemoryContextManager()
    core = AgentCore(MockProvider(), context)
    core.process(AgentChatRequest(session_id="a", message="pesan A"))
    assert context.get("b") == []
    assert context.get("a")


def test_api_chat_contract():
    response = TestClient(app).post("/api/v1/agent/chat", json={"message": "Apa itu margin?", "workflow": "informational"})
    assert response.status_code == 200
    body = response.json()
    assert body["workflow"] == "informational"
    assert body["provider"] == "mock"
    assert "session_id" in body


def test_invalid_chat_input():
    response = TestClient(app).post("/api/v1/agent/chat", json={"message": ""})
    assert response.status_code == 422


def test_provider_failure_is_not_success():
    class FailingProvider(MockProvider):
        def answer(self, prompt):
            raise ProviderError("provider unavailable")
    try:
        AgentCore(FailingProvider()).process(AgentChatRequest(message="halo"))
    except ProviderError:
        pass
    else:
        raise AssertionError("provider failure was swallowed")
