"""Async Semantic Scholar API client for finding related papers."""

import httpx

S2_API_BASE = "https://api.semanticscholar.org/graph/v1"


async def search_related(title: str, limit: int = 10) -> list[dict]:
    """Search Semantic Scholar for papers related to the given title."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            resp = await client.get(
                f"{S2_API_BASE}/paper/search",
                params={
                    "query": title,
                    "limit": limit,
                    "fields": "title,abstract,citationCount,url,year,authors",
                },
            )
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPStatusError, httpx.RequestError):
            return []

    papers = []
    for paper in data.get("data", []):
        authors = paper.get("authors", [])
        author_names = [a.get("name", "") for a in authors[:5]] if authors else []
        papers.append({
            "title": paper.get("title", ""),
            "abstract": (paper.get("abstract") or "")[:300],
            "citation_count": paper.get("citationCount", 0),
            "url": paper.get("url", ""),
            "year": paper.get("year"),
            "authors": author_names,
        })
    return papers
