"""API routes for paper Q&A chat."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Paper
from app.services.qa_service import ask_question, get_chat_history

router = APIRouter(prefix="/api/papers", tags=["chat"])


class ChatRequest(BaseModel):
    question: str


@router.post("/{paper_id}/chat")
async def chat_with_paper(
    paper_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Ask a question about a paper using RAG."""
    # Verify paper exists
    stmt = select(Paper).where(Paper.id == paper_id)
    result = await db.execute(stmt)
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if not paper.raw_text:
        raise HTTPException(status_code=400, detail="Paper has no text to analyze")

    try:
        answer = await ask_question(paper_id, request.question, db)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{paper_id}/chat/history")
async def get_history(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Get chat history for a paper."""
    history = await get_chat_history(paper_id, db)
    return {"messages": history}
