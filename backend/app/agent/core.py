from uuid import uuid4

from .context_manager import InMemoryContextManager
from .intent_router import IntentRouter
from .prompts import WORKFLOW_INSTRUCTIONS
from .provider import LLMProvider
from .schemas import AgentChatRequest, AgentChatResponse


class AgentCore:
    def __init__(self, provider: LLMProvider, context: InMemoryContextManager | None = None) -> None:
        self.provider = provider
        self.context = context or InMemoryContextManager()
        self.router = IntentRouter()

    def process(self, request: AgentChatRequest) -> AgentChatResponse:
        session_id = request.session_id or f"session-{uuid4().hex}"
        workflow = self.router.route(request.message, request.workflow)
        history = self.context.get(session_id)
        prompt = f"Workflow: {workflow.value}\n{WORKFLOW_INSTRUCTIONS[workflow.value]}\nConversation: {history}\nUser: {request.message}"
        result = self.provider.answer(prompt)
        self.context.append(session_id, "user", request.message)
        self.context.append(session_id, "assistant", result.answer)
        return AgentChatResponse(session_id=session_id, workflow=workflow, status="completed", provider=self.provider.name, **result.model_dump())
