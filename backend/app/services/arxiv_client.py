"""Async arXiv API client for fetching and searching papers."""

import httpx
import re
import xml.etree.ElementTree as ET

ARXIV_API_BASE = "https://export.arxiv.org/api/query"
ARXIV_PDF_BASE = "https://arxiv.org/pdf/"

ATOM_NS = "{http://www.w3.org/2005/Atom}"


def extract_arxiv_id(input_str: str) -> str | None:
    """Extract arXiv ID from a URL or plain ID string."""
    patterns = [
        r"arxiv\.org/abs/(\d+\.\d+(?:v\d+)?)",
        r"arxiv\.org/pdf/(\d+\.\d+(?:v\d+)?)",
        r"^(\d{4}\.\d{4,5}(?:v\d+)?)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, input_str.strip())
        if match:
            return match.group(1)
    return None


async def fetch_paper_metadata(arxiv_id: str) -> dict:
    """Fetch paper metadata from arXiv Atom feed."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(ARXIV_API_BASE, params={"id_list": arxiv_id})
        resp.raise_for_status()

    root = ET.fromstring(resp.text)
    entry = root.find(f"{ATOM_NS}entry")
    if entry is None:
        raise ValueError(f"No paper found for arXiv ID: {arxiv_id}")

    title = entry.findtext(f"{ATOM_NS}title", "").strip().replace("\n", " ")
    summary = entry.findtext(f"{ATOM_NS}summary", "").strip()
    authors = [a.findtext(f"{ATOM_NS}name", "") for a in entry.findall(f"{ATOM_NS}author")]
    published = entry.findtext(f"{ATOM_NS}published", "")

    return {
        "arxiv_id": arxiv_id,
        "title": title,
        "abstract": summary,
        "authors": authors,
        "published": published,
        "pdf_url": f"{ARXIV_PDF_BASE}{arxiv_id}.pdf",
    }


async def download_pdf(arxiv_id: str) -> bytes:
    """Download PDF bytes for an arXiv paper."""
    url = f"{ARXIV_PDF_BASE}{arxiv_id}.pdf"
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def search_papers(query: str, max_results: int = 10) -> list[dict]:
    """Search arXiv for papers matching query."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(
            ARXIV_API_BASE,
            params={"search_query": f"all:{query}", "max_results": max_results, "sortBy": "relevance"},
        )
        resp.raise_for_status()

    root = ET.fromstring(resp.text)
    results = []
    for entry in root.findall(f"{ATOM_NS}entry"):
        title = entry.findtext(f"{ATOM_NS}title", "").strip().replace("\n", " ")
        summary = entry.findtext(f"{ATOM_NS}summary", "").strip()
        authors = [a.findtext(f"{ATOM_NS}name", "") for a in entry.findall(f"{ATOM_NS}author")]
        link = entry.find(f"{ATOM_NS}id")
        results.append({
            "title": title,
            "abstract": summary[:300] + "..." if len(summary) > 300 else summary,
            "authors": authors[:5],
            "url": link.text if link is not None else "",
        })
    return results
