"""Agent 4 – Research Gap Detector: identifies limitations and unexplored areas."""

from app.agents.base_agent import BaseAgent
from app.services.llm_service import generate_json


class GapDetectorAgent(BaseAgent):
    name = "gap_detector"
    description = "Analyzes limitations, identifies unexplored areas, suggests improvements"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        extraction = context.get("structured_extractor", {})
        related = context.get("related_research", {})

        limitations = extraction.get("limitations", [])
        future_work = extraction.get("future_work", [])
        comparison = related.get("comparison_summary", "")
        unique = related.get("unique_contributions", [])

        prompt = f"""Perform a thorough research gap analysis for this paper.

PAPER TEXT (excerpt):
{paper_text[:8000]}

EXTRACTED LIMITATIONS:
{str(limitations)}

FUTURE WORK MENTIONED:
{str(future_work)}

RELATED WORK COMPARISON:
{comparison}

UNIQUE CONTRIBUTIONS:
{str(unique)}

Return a JSON object:
{{
    "identified_gaps": [
        {{
            "gap": "Description of the research gap",
            "severity": "high/medium/low",
            "category": "methodological/theoretical/empirical/application",
            "evidence": "What in the paper suggests this gap"
        }}
    ],
    "unexplored_areas": [
        {{
            "area": "Description of unexplored research area",
            "potential_impact": "Why exploring this could be valuable",
            "suggested_approach": "How one might explore this area"
        }}
    ],
    "improvement_suggestions": [
        {{
            "suggestion": "Specific improvement that could be made",
            "type": "methodology/scale/evaluation/application/theory",
            "difficulty": "easy/moderate/hard",
            "expected_impact": "What improvement this could bring"
        }}
    ],
    "novelty_assessment": {{
        "score": 7,
        "justification": "Why this novelty score is assigned (1-10 scale)",
        "strengths": ["Specific strengths of the paper"],
        "weaknesses": ["Specific weaknesses of the paper"]
    }},
    "overall_gap_summary": "2-3 paragraph summary of the gap analysis"
}}
"""
        return await generate_json(
            prompt,
            system_instruction="You are a senior researcher and peer reviewer. Be thorough, constructive, and specific in identifying gaps and suggesting improvements."
        )
