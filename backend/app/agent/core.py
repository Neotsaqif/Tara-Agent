"""Agent orchestration for offline/unit-test and production entry points.

The production API uses :meth:`process_persisted`; :meth:`process` remains a
small in-memory compatibility path for the existing unit tests and for local
mock usage without an authenticated tenant.
"""
from __future__ import annotations

from uuid import uuid4

from .context_manager import DatabaseContextManager, InMemoryContextManager, Message
from .intent_router import IntentRouter, PreviousTurn
from .prompts import WORKFLOW_INSTRUCTIONS, build_prompt
from .provider import LLMProvider
from .schemas import AgentChatRequest, AgentChatResponse, ChatStatus


class AgentCore:
    def __init__(self, provider: LLMProvider, context: InMemoryContextManager | None = None) -> None:
        self.provider = provider
        self.context = context or InMemoryContextManager()
        self.router = IntentRouter()

    def _decision(self, request: AgentChatRequest, previous: PreviousTurn | None = None):
        return self.router.route_decision(request.message, request.workflow, previous=previous)

    def process(self, request: AgentChatRequest) -> AgentChatResponse:
        """Compatibility path: in-memory, unauthenticated, no business data."""
        conversation_id = request.resolved_conversation_id or f"session-{uuid4().hex}"
        history = self.context.get(conversation_id)
        previous = PreviousTurn(
            last_user_message=next((m.content for m in reversed(history) if m.role == "user"), ""),
            last_workflow=next((m.workflow for m in reversed(history) if m.workflow), None),
            message_count=len(history),
        )
        decision = self._decision(request, previous)
        workflow = decision.workflow
        history_payload = [{"role": m.role, "content": m.content} for m in history]
        prompt = build_prompt(
            workflow=workflow.value,
            history=history_payload,
            user_message=request.message,
            tool_block="(Tidak ada tool; mode compatibility tanpa dataset.)",
            data_status="unavailable",
            constraints_block="(Tidak tersedia pada mode compatibility.)",
        )
        result = self.provider.answer(prompt)
        self.context.append(conversation_id, "user", request.message, workflow=workflow.value)
        self.context.append(conversation_id, "assistant", result.answer, workflow=workflow.value)
        return AgentChatResponse(
            conversation_id=conversation_id,
            session_id=conversation_id,
            workflow=workflow,
            status=ChatStatus.COMPLETED,
            routing=decision.meta,
            provider=self.provider.name,
            model=getattr(self.provider, "model", None),
            **result.model_dump(),
        )

    def process_persisted(self, request: AgentChatRequest, *, db, principal, data_port=None) -> AgentChatResponse:  # noqa: ANN001
        """Production orchestration hook.

        This method is intentionally kept separate from ``process`` so the
        unauthenticated compatibility tests cannot accidentally become a way to
        query tenant data. It creates/resumes an owned conversation, persists
        both turns, routes with previous context, and formulates a response.
        Tool execution is injected through ``data_port`` and will be added by
        the API service once the tool request parser is connected.
        """
        context = DatabaseContextManager(db)
        conversation = context.resolve_conversation(
            conversation_id=request.resolved_conversation_id,
            user_id=principal.user_id,
            organization_id=principal.organization_id,
            first_message=request.message,
            outlet_id=request.outlet_id,
        )
        history = context.recent_messages(conversation_id=conversation.id, limit=12)
        previous_workflow = None
        if conversation.workflow:
            try:
                from .schemas import WorkflowRoute

                previous_workflow = WorkflowRoute(conversation.workflow)
            except ValueError:
                previous_workflow = None
        decision = self._decision(
            request,
            PreviousTurn(
                last_user_message=next((m.content for m in reversed(history) if m.role == "user"), ""),
                last_workflow=previous_workflow,
                message_count=len(history),
            ),
        )
        context.append_user(conversation_id=conversation.id, content=request.message, workflow=decision.workflow.value)
        context.set_workflow(conversation, decision.workflow.value)
        # Flush so the conversation row is visible to subsequent requests in the
        # same logical transaction. The API layer commits; this keeps the
        # orchestration testable (a rollback discards everything).
        db.flush()

        prompt = build_prompt(
            workflow=decision.workflow.value,
            history=[{"role": m.role, "content": m.content} for m in history],
            user_message=request.message,
            tool_block="(Tool execution belum dipilih atau data belum tersedia.)",
            data_status="awaiting tool selection",
            constraints_block="(Constraint gate aktif di backend.)",
        )
        result = self.provider.answer(prompt)
        assistant = context.append_assistant(
            conversation_id=conversation.id,
            content=result.answer,
            workflow=decision.workflow.value,
            evidence=result.evidence,
            assumptions=result.assumptions,
            limitations=result.limitations,
            routing_meta=decision.meta.model_dump(),
            provider=self.provider.name,
        )
        return AgentChatResponse(
            conversation_id=conversation.id,
            session_id=conversation.id,
            workflow=decision.workflow,
            status=ChatStatus.COMPLETED,
            routing=decision.meta,
            provider=self.provider.name,
            model=getattr(self.provider, "model", None),
            message_id=assistant.id,
            **result.model_dump(),
        )
