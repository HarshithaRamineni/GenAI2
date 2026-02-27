"""Agent 7 – Plagiarism Checker: detects potential overlap with existing published work."""

from app.agents.base_agent import BaseAgent
from app.services.semantic_scholar import search_related
from app.services.llm_service import generate_json


class PlagiarismCheckerAgent(BaseAgent):
    name = "plagiarism_checker"
    description = "Checks paper originality against existing published research"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        extraction = context.get("structured_extractor", {})
        title = extraction.get("title", "")
        contributions = extraction.get("contributions", [])
        methodology = extraction.get("methodology", {})
        results = extraction.get("results", {})

        # Step 1: Extract key claims from the paper using LLM
        claims_prompt = f"""Extract the 8-10 most important and specific claims or contributions from this research paper.
Focus on claims that could potentially overlap with existing published work.

PAPER TEXT (excerpt):
{paper_text[:8000]}

TITLE: {title}
CONTRIBUTIONS: {str(contributions)[:1000]}
METHODOLOGY: {str(methodology)[:1000]}

Return a JSON object:
{{
    "claims": [
        {{
            "id": "claim_1",
            "text": "The specific claim or contribution",
            "category": "methodology|finding|contribution|theoretical",
            "search_query": "Concise 5-8 word search query to find similar work on Semantic Scholar"
        }}
    ]
}}
"""
        claims_result = await generate_json(
            claims_prompt,
            system_instruction="You are an academic integrity expert. Extract precise, verifiable claims from research papers."
        )
        claims = claims_result.get("claims", [])
        if not claims:
            return {
                "overall_originality_score": 100,
                "verdict": "original",
                "verdict_label": "Highly Original",
                "flagged_sections": [],
                "matched_sources": [],
                "summary": "No specific claims could be extracted for comparison."
            }

        # Step 2: Search Semantic Scholar for each claim
        all_sources = []
        for claim in claims[:8]:
            query = claim.get("search_query", claim.get("text", ""))[:100]
            try:
                results_list = await search_related(query, limit=3)
                for paper in results_list:
                    paper["matched_claim_id"] = claim.get("id", "")
                    all_sources.append(paper)
            except Exception:
                continue

        # Step 3: LLM-based comparison for originality scoring
        analysis_prompt = f"""You are an academic plagiarism and originality checker. Compare the paper's claims against potentially similar published work.

PAPER BEING CHECKED:
Title: {title}
Key Claims:
{str(claims)[:3000]}

Paper Text Excerpt:
{paper_text[:6000]}

POTENTIALLY SIMILAR PUBLISHED WORK:
{str(all_sources)[:5000]}

Analyze the originality of this paper. For each claim, determine if it overlaps with existing work.

Return a JSON object:
{{
    "overall_originality_score": 85,
    "verdict": "original|mostly_original|some_overlap|significant_overlap|high_similarity",
    "verdict_label": "Highly Original|Mostly Original|Some Overlap Detected|Significant Overlap|High Similarity Detected",
    "flagged_sections": [
        {{
            "claim_id": "claim_1",
            "claim_text": "The claim being flagged",
            "severity": "low|medium|high",
            "overlap_percentage": 30,
            "explanation": "Why this was flagged and what similar work exists",
            "similar_source_title": "Title of the similar published paper",
            "similar_source_url": "URL if available"
        }}
    ],
    "matched_sources": [
        {{
            "title": "Source paper title",
            "authors": "First Author et al.",
            "year": 2024,
            "url": "URL",
            "similarity_score": 25,
            "overlap_description": "Brief description of what overlaps"
        }}
    ],
    "original_contributions": [
        "What is genuinely novel about this paper"
    ],
    "summary": "2-3 sentence overall assessment of the paper's originality"
}}

IMPORTANT RULES:
- overall_originality_score: 0-100 where 100 is fully original
- Be fair — similar methodology doesn't mean plagiarism
- Research building on prior work is normal; flag only significant textual or conceptual overlap
- Include 3-8 flagged sections (even low severity ones)
- Include 3-8 matched sources sorted by similarity
- Lower severity for common methods; higher for copied results/conclusions
"""
        report = await generate_json(
            analysis_prompt,
            system_instruction="You are a fair, thorough academic plagiarism detector. Distinguish between legitimate building-on-prior-work and actual problematic overlap. Be accurate with similarity scores."
        )

        # Attach raw search data
        report["raw_search_results"] = len(all_sources)
        report["claims_analyzed"] = len(claims)
        return report
