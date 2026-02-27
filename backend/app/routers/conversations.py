"""API routes for conversation history (cross-paper)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models import ChatMessage, Paper

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    """List all papers that have chat messages, with last message preview."""
    # Subquery: latest message per paper
    latest_msg = (
        select(
            ChatMessage.paper_id,
            func.count(ChatMessage.id).label("message_count"),
            func.max(ChatMessage.created_at).label("last_activity"),
        )
        .group_by(ChatMessage.paper_id)
        .subquery()
    )

    stmt = (
        select(
            Paper.id,
            Paper.title,
            latest_msg.c.message_count,
            latest_msg.c.last_activity,
        )
        .join(latest_msg, Paper.id == latest_msg.c.paper_id)
        .order_by(desc(latest_msg.c.last_activity))
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    conversations = []
    for row in rows:
        paper_id, title, count, last_activity = row

        # Get the last message content
        last_msg_stmt = (
            select(ChatMessage.content)
            .where(ChatMessage.paper_id == paper_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg_result = await db.execute(last_msg_stmt)
        last_content = last_msg_result.scalar() or ""

        conversations.append({
            "paper_id": paper_id,
            "paper_title": title,
            "message_count": count,
            "last_message": last_content[:200] if last_content else "",
            "last_activity": last_activity.isoformat() if last_activity else None,
        })

    return conversations
