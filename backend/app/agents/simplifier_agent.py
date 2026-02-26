"""Agent 2 – Simplifier: generates multi-level explanations of the paper."""

from app.agents.base_agent import BaseAgent
from app.services.llm_service import generate_json


class SimplifierAgent(BaseAgent):
    name = "simplifier"
    description = "Generates beginner, intermediate, and expert-level explanations"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        extraction = context.get("structured_extractor", {})
        title = extraction.get("title", "this research paper")

        prompt = f"""Based on the following research paper, generate explanations at three different levels of complexity.

PAPER TITLE: {title}

PAPER TEXT:
{paper_text[:10000]}

EXTRACTED INFORMATION:
{str(extraction)[:3000]}

Return a JSON object with these exact keys:
{{
    "beginner": {{
        "summary": "A simple, jargon-free explanation that a high school student could understand (3-5 sentences)",
        "key_concepts": ["Simple explanations of key concepts used in the paper"],
        "analogy": "A real-world analogy that explains the core idea"
    }},
    "intermediate": {{
        "summary": "A moderately technical explanation for someone with basic CS/science background (5-8 sentences)",
        "technical_concepts": ["Brief explanations of technical concepts"],
        "significance": "Why this work matters in the field"
    }},
    "expert": {{
        "summary": "A detailed technical summary for domain experts (8-12 sentences)",
        "novelty": "What's novel about this approach compared to prior work",
        "technical_depth": "Deep dive into the methodology and its implications",
        "critique": "Potential strengths and weaknesses from an expert perspective"
    }},
    "key_takeaways": ["5-7 bullet points summarizing the most important aspects"],
    "one_liner": "A single sentence that captures the essence of the paper"
}}
"""
        return await generate_json(
            prompt,
            system_instruction="You are an expert science communicator who can explain complex research at any level. Be accurate, engaging, and clear."
        )
