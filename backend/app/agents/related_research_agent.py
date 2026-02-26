"""Agent 3 – Related Research Finder: discovers and compares similar papers."""

from app.agents.base_agent import BaseAgent
from app.services.semantic_scholar import search_related
from app.services.arxiv_client import search_papers
from app.services.llm_service import generate_json


class RelatedResearchAgent(BaseAgent):
    name = "related_research"
    description = "Finds similar papers and compares contributions"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        extraction = context.get("structured_extractor", {})
        title = extraction.get("title", "")
        methodology = extraction.get("methodology", {})

        # Build search query from title and methodology
        search_query = title or paper_text[:200]

        # Fetch from both APIs
        s2_results = await search_related(title, limit=8) if title else []
        arxiv_results = await search_papers(search_query, max_results=5)

        # Use LLM to analyze and compare
        prompt = f"""Given the following research paper and related papers found, provide a comparative analysis.

CURRENT PAPER:
Title: {title}
Methodology: {str(methodology)[:1000]}

RELATED PAPERS FROM SEMANTIC SCHOLAR:
{str(s2_results)[:3000]}

RELATED PAPERS FROM ARXIV:
{str(arxiv_results)[:3000]}

Return a JSON object:
{{
    "related_papers": [
        {{
            "title": "Paper title",
            "authors": ["authors"],
            "year": 2024,
            "citation_count": 0,
            "url": "paper url",
            "relevance": "How this paper relates to the current work",
            "similarity_score": 0.85
        }}
    ],
    "comparison_summary": "Overall comparison of the current paper with related work",
    "unique_contributions": ["What the current paper does differently"],
    "research_landscape": "Brief overview of the research area and where this paper fits",
    "most_cited_related": "Title and significance of the most influential related paper"
}}

Include up to 10 most relevant papers. Deduplicate across sources.
"""
        llm_analysis = await generate_json(
            prompt,
            system_instruction="You are a research librarian expert at finding connections between papers."
        )

        # Merge raw API results with LLM analysis
        llm_analysis["raw_semantic_scholar"] = s2_results
        llm_analysis["raw_arxiv"] = arxiv_results
        return llm_analysis
