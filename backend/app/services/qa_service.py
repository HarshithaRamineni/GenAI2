"""RAG-based Q&A service for asking questions about papers."""

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import ChatMessage
from app.rag.retriever import retrieve_chunks
from app.services.llm_service import generate


async def ask_question(
    paper_id: str,
    question: str,
    db: AsyncSession,
) -> str:
    """Answer a question about a paper using RAG.

    1. Retrieve relevant chunks from the paper's vector index.
    2. Fetch recent chat history for conversational context.
    3. Build augmented prompt and generate answer.
    4. Store both messages in the database.
    """
    # Step 1: Retrieve relevant chunks
    chunks = retrieve_chunks(paper_id, question, top_k=5)
    context_text = "\n\n---\n\n".join(chunks) if chunks else "No relevant context found."

    # Step 2: Get recent chat history
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.paper_id == paper_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    history = list(reversed(result.scalars().all()))

    history_text = ""
    if history:
        history_text = "PREVIOUS CONVERSATION:\n"
        for msg in history:
            role = "User" if msg.role == "user" else "Assistant"
            history_text += f"{role}: {msg.content}\n"

    # Step 3: Build prompt
    prompt = f"""You are a research paper analysis assistant. Answer the user's question based on the provided context from the paper. Be accurate and cite specific parts of the paper when possible. If the answer cannot be determined from the context, say so honestly.

RELEVANT PAPER SECTIONS:
{context_text}

{history_text}

USER QUESTION: {question}

Provide a clear, well-structured answer."""

    # Step 4: Generate answer
    answer = await generate(prompt)

    # Step 5: Store messages
    user_msg = ChatMessage(paper_id=paper_id, role="user", content=question)
    assistant_msg = ChatMessage(paper_id=paper_id, role="assistant", content=answer)
    db.add(user_msg)
    db.add(assistant_msg)
    await db.commit()

    return answer


async def get_chat_history(paper_id: str, db: AsyncSession) -> list[dict]:
    """Get full chat history for a paper."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.paper_id == paper_id)
        .order_by(ChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
        for msg in messages
    ]
