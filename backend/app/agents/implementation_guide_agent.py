"""Agent 5 – Implementation Guide Generator: suggests tech stack and prototype plan."""

from app.agents.base_agent import BaseAgent
from app.services.llm_service import generate_json


class ImplementationGuideAgent(BaseAgent):
    name = "implementation_guide"
    description = "Suggests tech stack, architecture outline, and prototype plan"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        extraction = context.get("structured_extractor", {})
        methodology = extraction.get("methodology", {})
        results = extraction.get("results", {})

        prompt = f"""Based on the following research paper, generate a practical implementation guide for someone wanting to reproduce or build upon this work.

PAPER TEXT (excerpt):
{paper_text[:8000]}

METHODOLOGY:
{str(methodology)[:2000]}

RESULTS:
{str(results)[:2000]}

Return a JSON object:
{{
    "tech_stack": {{
        "programming_languages": ["Recommended languages with justification"],
        "frameworks": ["Frameworks/libraries needed"],
        "infrastructure": ["Cloud services, GPUs, databases needed"],
        "estimated_cost": "Rough cost estimate for running the implementation"
    }},
    "architecture": {{
        "overview": "High-level architecture description",
        "components": [
            {{
                "name": "Component name",
                "purpose": "What this component does",
                "technologies": ["Technologies used"],
                "complexity": "low/medium/high"
            }}
        ],
        "data_flow": "How data moves through the system"
    }},
    "prototype_plan": {{
        "phase_1": {{
            "title": "MVP Phase",
            "duration": "Estimated time",
            "tasks": ["List of tasks"],
            "deliverables": ["Expected outputs"]
        }},
        "phase_2": {{
            "title": "Enhancement Phase",
            "duration": "Estimated time",
            "tasks": ["List of tasks"],
            "deliverables": ["Expected outputs"]
        }},
        "phase_3": {{
            "title": "Production Phase",
            "duration": "Estimated time",
            "tasks": ["List of tasks"],
            "deliverables": ["Expected outputs"]
        }}
    }},
    "code_skeleton": "A high-level pseudocode or Python-like skeleton showing the core algorithm structure",
    "key_challenges": ["Technical challenges to anticipate during implementation"],
    "prerequisites": ["Knowledge and skills needed to implement this"],
    "datasets_needed": ["Datasets required and where to find them"],
    "evaluation_strategy": "How to evaluate if the implementation is correct"
}}
"""
        return await generate_json(
            prompt,
            system_instruction="You are a senior software architect who specializes in turning research papers into practical implementations. Be specific, actionable, and realistic.",
            agent_name=self.name,
        )
