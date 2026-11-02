"""Conversation context.

Two implementations of :class:`ContextManager`:

* :class:`InMemoryContextManager` — isolated sessions for unit tests only.
* :class:`DatabaseContextManager` — the application's source of truth. It stores
  conversations/messages in the ``conversations`` and ``messages`` tables and
  enforces user/organization ownership on every read.

The application always uses the database implementation. In-memory is retained
because it makes agent tests fast and independent from the DB.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Protocol

from sqlalchemy.orm import Session

from ..db.models import Conversation, Message as MessageModel
from ..db.repositories import ConversationRepository, MessageRepository


@dataclass(frozen=True)
class Message:
    role: str
    content: str
    workflow: str | None = None
    evidence: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)


class ContextError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 403) -> None:
        super().__init__(message)
        self.status_code = status_code


class ContextManager(Protocol):
    def recent_messages(self, *, conversation_id: str, limit: int = 12) -> list[Message]: ...


# ── In-memory (unit tests) ────────────────────────────────────────────────
class InMemoryContextManager:
    """Session-isolated context; contents disappear when the process restarts."""

    def __init__(self, max_messages: int = 12) -> None:
        from collections import defaultdict, deque

        self._messages: defaultdict[str, deque[Message]] = defaultdict(lambda: deque(maxlen=max_messages))
        self._lock = Lock()

    def get(self, session_id: str) -> list[Message]:
        with self._lock:
            return list(self._messages[session_id])

    def append(self, session_id: str, role: str, content: str, **kwargs) -> None:
        with self._lock:
            self._messages[session_id].append(Message(role=role, content=content, **kwargs))

    def recent_messages(self, *, conversation_id: str, limit: int = 12) -> list[Message]:
        return self.get(conversation_id)[-limit:]


# ── Database-backed ───────────────────────────────────────────────────────
class DatabaseContextManager:
    """Persistent conversation store scoped to (user, organization)."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.conversations = ConversationRepository(db)
        self.messages = MessageRepository(db)

    # ── Conversation lifecycle ────────────────────────────────────────
    def get_owned_conversation(
        self,
        *,
        conversation_id: str,
        user_id: str,
        organization_id: str,
    ) -> Conversation | None:
        """Return the conversation only if it belongs to this user *and* org.

        Cross-tenant access returns ``None`` (indistinguishable from "not found")
        so callers cannot enumerate other tenants' conversation ids.
        """
        conversation = self.conversations.by_id(conversation_id)
        if conversation is None:
            return None
        if conversation.user_id != user_id or conversation.organization_id != organization_id:
            return None
        return conversation

    def require_owned_conversation(
        self,
        *,
        conversation_id: str,
        user_id: str,
        organization_id: str,
    ) -> Conversation:
        conversation = self.get_owned_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            organization_id=organization_id,
        )
        if conversation is None:
            raise ContextError("Percakapan tidak ditemukan atau bukan milik Anda.", status_code=404)
        return conversation

    def create_conversation(
        self,
        *,
        organization_id: str,
        user_id: str,
        title: str,
        outlet_id: str | None = None,
    ) -> Conversation:
        return self.conversations.create(
            organization_id=organization_id,
            user_id=user_id,
            title=title or "Percakapan baru",
            outlet_id=outlet_id,
        )

    def resolve_conversation(
        self,
        *,
        conversation_id: str | None,
        user_id: str,
        organization_id: str,
        first_message: str,
        outlet_id: str | None = None,
    ) -> Conversation:
        """Resume an owned conversation or create a new one.

        A provided id that is not owned by the caller is rejected (403) rather
        than silently creating a new conversation, which would mask an attempt
        to read another tenant's session.
        """
        if conversation_id:
            conversation = self.get_owned_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                organization_id=organization_id,
            )
            if conversation is None:
                raise ContextError("Session tidak valid untuk pengguna ini.", status_code=403)
            return conversation
        title = (first_message.strip().splitlines()[0] if first_message.strip() else "Percakapan baru")[:200]
        return self.create_conversation(
            organization_id=organization_id,
            user_id=user_id,
            title=title,
            outlet_id=outlet_id,
        )

    def list_conversations(self, *, user_id: str, organization_id: str) -> list[Conversation]:
        return self.conversations.list_for_user(user_id=user_id, organization_id=organization_id)

    def delete(self, conversation: Conversation) -> None:
        self.conversations.delete(conversation)

    # ── Messages ──────────────────────────────────────────────────────
    def recent_messages(self, *, conversation_id: str, limit: int = 12) -> list[Message]:
        rows = self.messages.recent(conversation_id, limit=limit)
        return [
            Message(
                role=row.role,
                content=row.content,
                workflow=row.workflow,
                evidence=list(row.evidence or []),
                assumptions=list(row.assumptions or []),
                limitations=list(row.limitations or []),
            )
            for row in rows
            if row.role in {"user", "assistant"}
        ]

    def recent_rows(self, *, conversation_id: str, limit: int = 50) -> list[MessageModel]:
        """Raw rows (used by the conversation detail endpoint)."""
        return self.messages.recent(conversation_id, limit=limit)

    def append_user(self, *, conversation_id: str, content: str, workflow: str | None = None) -> MessageModel:
        return self.messages.add(conversation_id=conversation_id, role="user", content=content, workflow=workflow)

    def append_assistant(
        self,
        *,
        conversation_id: str,
        content: str,
        workflow: str | None = None,
        evidence: list[str] | None = None,
        assumptions: list[str] | None = None,
        limitations: list[str] | None = None,
        routing_meta: dict | None = None,
        provider: str | None = None,
    ) -> MessageModel:
        return self.messages.add(
            conversation_id=conversation_id,
            role="assistant",
            content=content,
            workflow=workflow,
            evidence=evidence,
            assumptions=assumptions,
            limitations=limitations,
            routing_meta=routing_meta,
            provider=provider,
        )

    def set_workflow(self, conversation: Conversation, workflow: str) -> None:
        self.conversations.set_workflow(conversation, workflow)
