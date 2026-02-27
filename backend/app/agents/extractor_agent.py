"""Agent 1 – Structured Extractor: extracts key research paper components."""

from app.agents.base_agent import BaseAgent
from app.services.llm_service import generate_json


class ExtractorAgent(BaseAgent):
    name = "structured_extractor"
    description = "Extracts problem statement, methodology, dataset, results, and limitations"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        prompt = f"""Analyze the following research paper and extract structured information.

RESEARCH PAPER TEXT:
{paper_text[:12000]}

Extract and return a JSON object with these exact keys:
{{
    "title": "Paper title",
    "authors": ["List of authors if identifiable"],
    "problem_statement": "Clear description of the problem being addressed",
    "objectives": ["List of research objectives"],
    "methodology": {{
        "approach": "Overall methodological approach",
        "techniques": ["Specific techniques/algorithms used"],
        "description": "Detailed methodology description"
    }},
    "dataset": {{
        "name": "Dataset name(s)",
        "description": "Dataset description",
        "size": "Dataset size if mentioned",
        "source": "Where the data comes from"
    }},
    "results": {{
        "key_findings": ["List of main findings"],
        "metrics": {{"metric_name": "value"}},
        "comparison": "How results compare to baselines/prior work"
    }},
    "limitations": ["List of identified limitations"],
    "contributions": ["List of key contributions"],
    "future_work": ["Suggested future directions mentioned in the paper"]
}}
"""
        return await generate_json(
            prompt,
            system_instruction="You are an expert research paper analyst. Extract information accurately and comprehensively. If information is not found, use 'Not specified' as the value.",
            agent_name=self.name,
        )
