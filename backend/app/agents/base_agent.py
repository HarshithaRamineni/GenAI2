"""Abstract base class for all research analysis agents."""

import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Analysis


class BaseAgent(ABC):
    """Base agent that handles execution, logging, and result persistence."""

    name: str = "base"
    description: str = ""

    @abstractmethod
    async def _execute(self, paper_text: str, context: dict) -> dict:
        """Implement agent-specific logic. Returns a result dict."""
        ...

    async def run(self, paper_id: str, paper_text: str, context: dict, db: AsyncSession) -> dict:
        """Run the agent: execute, log, and save results."""
        analysis = Analysis(
            paper_id=paper_id,
            agent_name=self.name,
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        db.add(analysis)
        await db.commit()

        try:
            result = await self._execute(paper_text, context)
            analysis.result = json.dumps(result, ensure_ascii=False)
            analysis.status = "completed"
            analysis.finished_at = datetime.now(timezone.utc)
            await db.commit()
            return result
        except Exception as e:
            analysis.status = "error"
            analysis.error = str(e)
            analysis.finished_at = datetime.now(timezone.utc)
            await db.commit()
            return {"error": str(e)}
