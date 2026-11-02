"""Conversation history API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..agent.context_manager import ContextError, DatabaseContextManager
from ..auth.deps import get_current_principal
from ..auth.rbac import Principal
from ..db.session import get_db
from .schemas import ConversationDetail, ConversationOut

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


def _ctx(db: Session) -> DatabaseContextManager:
    return DatabaseContextManager(db)


@router.get("", response_model=list[ConversationOut])
def list_conversations(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[ConversationOut]:
    rows = _ctx(db).list_conversations(user_id=principal.user_id, organization_id=principal.organization_id)
    out: list[ConversationOut] = []
    for conv in rows:
        from ..db.models import Message as MessageModel
        from sqlalchemy import func, select

        count = db.scalar(select(func.count()).select_from(MessageModel).where(MessageModel.conversation_id == conv.id)) or 0
        out.append(
            ConversationOut(
                id=conv.id,
                title=conv.title,
                workflow=conv.workflow,
                outlet_id=conv.outlet_id,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=int(count),
            )
        )
    return out


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ConversationDetail:
    ctx = _ctx(db)
    try:
        conv = ctx.require_owned_conversation(
            conversation_id=conversation_id,
            user_id=principal.user_id,
            organization_id=principal.organization_id,
        )
    except ContextError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    messages = ctx.recent_rows(conversation_id=conv.id, limit=200)
    from .schemas import MessageOutRow

    return ConversationDetail(
        conversation=ConversationOut(
            id=conv.id,
            title=conv.title,
            workflow=conv.workflow,
            outlet_id=conv.outlet_id,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=len(messages),
        ),
        messages=[
            MessageOutRow(
                id=m.id,
                role=m.role,
                content=m.content,
                workflow=m.workflow,
                evidence=list(m.evidence or []),
                assumptions=list(m.assumptions or []),
                limitations=list(m.limitations or []),
                provider=m.provider,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict:
    ctx = _ctx(db)
    try:
        conv = ctx.require_owned_conversation(
            conversation_id=conversation_id,
            user_id=principal.user_id,
            organization_id=principal.organization_id,
        )
    except ContextError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    ctx.delete(conv)
    db.commit()
    return {"status": "deleted"}
