"""DAG-based agent orchestrator with SSE progress streaming."""

import asyncio
import json
from typing import AsyncGenerator, Callable, Awaitable
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.agents.extractor_agent import ExtractorAgent
from app.agents.simplifier_agent import SimplifierAgent
from app.agents.related_research_agent import RelatedResearchAgent
from app.agents.gap_detector_agent import GapDetectorAgent
from app.agents.implementation_guide_agent import ImplementationGuideAgent
from app.agents.knowledge_graph_agent import KnowledgeGraphAgent
from app.agents.plagiarism_checker_agent import PlagiarismCheckerAgent
from app.rag.retriever import build_paper_index
from app.models import Paper, PaperStatus
from app.database import async_session


# Agent instances
AGENTS = {
    "structured_extractor": ExtractorAgent(),
    "simplifier": SimplifierAgent(),
    "related_research": RelatedResearchAgent(),
    "gap_detector": GapDetectorAgent(),
    "implementation_guide": ImplementationGuideAgent(),
    "knowledge_graph": KnowledgeGraphAgent(),
    "plagiarism_checker": PlagiarismCheckerAgent(),
}

# Execution pipeline: (stage_name, [agents], [dependencies])
PIPELINE = [
    ("extraction", ["structured_extractor"], []),
    ("parallel_analysis", ["simplifier", "related_research", "implementation_guide", "knowledge_graph", "plagiarism_checker"], ["structured_extractor"]),
    ("gap_analysis", ["gap_detector"], ["structured_extractor", "related_research"]),
]


async def run_pipeline(
    paper_id: str,
    paper_text: str,
    db: AsyncSession,
    progress_callback: Callable[[str, str, str], Awaitable[None]] | None = None,
) -> dict:
    """Execute the full agent pipeline with DAG-based ordering.

    Args:
        paper_id: UUID of the paper being analyzed.
        paper_text: Full text of the paper.
        db: Async database session.
        progress_callback: Optional async callback(agent_name, status, detail).

    Returns:
        Dict of all agent results keyed by agent name.
    """
    context: dict = {}

    async def notify(agent: str, status: str, detail: str = ""):
        if progress_callback:
            await progress_callback(agent, status, detail)

    # Build RAG index first
    await notify("rag_indexer", "running", "Building vector index...")
    try:
        num_chunks = build_paper_index(paper_id, paper_text)
        await notify("rag_indexer", "completed", f"Indexed {num_chunks} chunks")
    except Exception as e:
        await notify("rag_indexer", "error", str(e))

    # Execute pipeline stages
    for stage_name, agent_names, deps in PIPELINE:
        # Verify dependencies are met
        missing_deps = [dep for dep in deps if dep not in context]
        if missing_deps:
            for agent_name in agent_names:
                await notify(agent_name, "error", f"Missing dependency: {', '.join(missing_deps)}")
            continue

        if len(agent_names) == 1:
            # Sequential execution
            agent_name = agent_names[0]
            agent = AGENTS[agent_name]
            await notify(agent_name, "running", f"Executing {agent.description}...")
            try:
                result = await agent.run(paper_id, paper_text, context, db)
                context[agent_name] = result
                status = "error" if "error" in result else "completed"
                await notify(agent_name, status, result.get("error", ""))
            except Exception as e:
                context[agent_name] = {"error": str(e)}
                await notify(agent_name, "error", str(e))
        else:
            # Parallel execution — each agent gets its own DB session
            async def run_agent(name: str):
                agent = AGENTS[name]
                await notify(name, "running", f"Executing {agent.description}...")
                try:
                    async with async_session() as agent_db:
                        result = await agent.run(paper_id, paper_text, context, agent_db)
                        await agent_db.commit()
                    context[name] = result
                    status = "error" if "error" in result else "completed"
                    await notify(name, status, result.get("error", ""))
                except Exception as e:
                    context[name] = {"error": str(e)}
                    await notify(name, "error", str(e))

            await asyncio.gather(*[run_agent(name) for name in agent_names])

    # Update paper status after pipeline
    try:
        stmt = select(Paper).where(Paper.id == paper_id)
        result = await db.execute(stmt)
        paper = result.scalar_one_or_none()
        if paper:
            has_errors = any("error" in v for v in context.values() if isinstance(v, dict))
            paper.status = PaperStatus.ERROR if has_errors else PaperStatus.COMPLETED
            await db.commit()
    except Exception:
        pass  # Don't fail the pipeline over a status update

    return context


async def stream_pipeline(
    paper_id: str,
    paper_text: str,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """Run pipeline and yield SSE events for each progress update."""
    events: asyncio.Queue = asyncio.Queue()

    async def callback(agent: str, status: str, detail: str):
        event = {"agent": agent, "status": status, "detail": detail}
        await events.put(json.dumps(event))

    async def run():
        try:
            result = await run_pipeline(paper_id, paper_text, db, callback)
            await events.put(json.dumps({"agent": "pipeline", "status": "completed", "detail": "All agents finished"}))
        except Exception as e:
            await events.put(json.dumps({"agent": "pipeline", "status": "error", "detail": str(e)}))
        finally:
            await events.put(None)  # Sentinel to stop streaming

    # Start pipeline in background
    task = asyncio.create_task(run())

    # Yield SSE events
    while True:
        event = await events.get()
        if event is None:
            break
        yield f"data: {event}\n\n"

    await task
