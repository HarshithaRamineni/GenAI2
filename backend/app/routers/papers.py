"""API routes for paper upload, listing, analysis, and results."""

import json
from collections import defaultdict
import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models import Paper, Analysis, PaperStatus, SourceType
from app.services.pdf_parser import extract_text_from_bytes
from app.services.arxiv_client import extract_arxiv_id, fetch_paper_metadata, download_pdf
from app.orchestrator import stream_pipeline
from app.config import get_settings

router = APIRouter(prefix="/api/papers", tags=["papers"])


@router.post("/upload")
async def upload_paper(
    file: UploadFile | None = File(None),
    url: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF file or submit an arXiv URL / ID."""
    if file and file.filename:
        # Handle PDF upload
        contents = await file.read()
        raw_text = extract_text_from_bytes(contents)

        # Save file to disk
        settings = get_settings()
        os.makedirs(settings.upload_dir, exist_ok=True)
        file_path = os.path.join(settings.upload_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(contents)

        paper = Paper(
            title=file.filename.replace(".pdf", "").replace("_", " ").title(),
            filename=file.filename,
            source_type=SourceType.PDF,
            raw_text=raw_text,
            status=PaperStatus.PENDING,
        )
        db.add(paper)
        await db.commit()
        await db.refresh(paper)
        return {"id": paper.id, "title": paper.title, "status": paper.status}

    elif url:
        # Handle arXiv URL/ID
        arxiv_id = extract_arxiv_id(url)
        if arxiv_id:
            metadata = await fetch_paper_metadata(arxiv_id)
            pdf_bytes = await download_pdf(arxiv_id)
            raw_text = extract_text_from_bytes(pdf_bytes)

            paper = Paper(
                title=metadata["title"],
                source_type=SourceType.ARXIV,
                source_url=url,
                raw_text=raw_text,
                status=PaperStatus.PENDING,
            )
        else:
            # Treat as generic URL — create paper without text for now
            paper = Paper(
                title="Paper from URL",
                source_type=SourceType.URL,
                source_url=url,
                status=PaperStatus.PENDING,
            )

        db.add(paper)
        await db.commit()
        await db.refresh(paper)
        return {"id": paper.id, "title": paper.title, "status": paper.status}

    raise HTTPException(status_code=400, detail="Please provide a PDF file or URL")


@router.get("")
async def list_papers(db: AsyncSession = Depends(get_db)):
    """List all uploaded papers."""
    stmt = select(Paper).order_by(Paper.upload_date.desc())
    result = await db.execute(stmt)
    papers = result.scalars().all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "source_type": p.source_type,
            "status": p.status,
            "upload_date": p.upload_date.isoformat() if p.upload_date else None,
        }
        for p in papers
    ]


@router.get("/search")
async def search_papers(q: str = "", db: AsyncSession = Depends(get_db)):
    """Search papers by title (case-insensitive substring match)."""
    if not q.strip():
        return []

    query = q.strip().lower()
    stmt = select(Paper).order_by(Paper.upload_date.desc())
    result = await db.execute(stmt)
    papers = result.scalars().all()

    matches = []
    for p in papers:
        title_lower = (p.title or "").lower()
        text_lower = (p.raw_text or "")[:2000].lower()

        # Score: title match is stronger
        score = 0
        if query in title_lower:
            score += 10
        # Check if query words appear in first 2000 chars of text
        query_words = query.split()
        word_hits = sum(1 for w in query_words if w in text_lower)
        score += word_hits

        if score > 0:
            matches.append((score, p))

    # Sort by score descending
    matches.sort(key=lambda x: x[0], reverse=True)

    return [
        {
            "id": p.id,
            "title": p.title,
            "source_type": p.source_type,
            "status": p.status,
            "upload_date": p.upload_date.isoformat() if p.upload_date else None,
        }
        for _, p in matches[:20]
    ]


@router.get("/{paper_id}")
async def get_paper(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Get paper details with all analysis results."""
    stmt = select(Paper).where(Paper.id == paper_id)
    result = await db.execute(stmt)
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Fetch analyses
    analysis_stmt = select(Analysis).where(Analysis.paper_id == paper_id).order_by(Analysis.created_at.desc())
    analysis_result = await db.execute(analysis_stmt)
    analyses = analysis_result.scalars().all()

    # Deduplicate: keep only the latest analysis per agent_name
    analysis_map = {}
    seen_agents = set()
    for a in analyses:
        if a.agent_name in seen_agents:
            continue
        seen_agents.add(a.agent_name)
        try:
            analysis_map[a.agent_name] = {
                "status": a.status,
                "result": json.loads(a.result) if a.result else {},
                "error": a.error,
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "finished_at": a.finished_at.isoformat() if a.finished_at else None,
            }
        except json.JSONDecodeError:
            analysis_map[a.agent_name] = {"status": a.status, "result": {}, "error": a.error}

    return {
        "id": paper.id,
        "title": paper.title,
        "source_type": paper.source_type,
        "source_url": paper.source_url,
        "status": paper.status,
        "upload_date": paper.upload_date.isoformat() if paper.upload_date else None,
        "text_length": len(paper.raw_text) if paper.raw_text else 0,
        "analyses": analysis_map,
    }


@router.get("/{paper_id}/analyze")
async def analyze_paper(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Start analysis pipeline and stream progress via SSE."""
    stmt = select(Paper).where(Paper.id == paper_id)
    result = await db.execute(stmt)
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if not paper.raw_text:
        raise HTTPException(status_code=400, detail="Paper has no text to analyze")

    # Delete old analyses to start fresh
    await db.execute(delete(Analysis).where(Analysis.paper_id == paper_id))

    # Update paper status
    paper.status = PaperStatus.PROCESSING
    await db.commit()

    return StreamingResponse(
        stream_pipeline(paper_id, paper.raw_text, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
