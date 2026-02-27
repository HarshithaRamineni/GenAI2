"""Agent 6 – Knowledge Graph Builder: extracts entities and relationships into a graph."""

from app.agents.base_agent import BaseAgent
from app.services.llm_service import generate_json


class KnowledgeGraphAgent(BaseAgent):
    name = "knowledge_graph"
    description = "Extracts key entities and relationships to build an interactive knowledge graph"

    async def _execute(self, paper_text: str, context: dict) -> dict:
        extraction = context.get("structured_extractor", {})
        title = extraction.get("title", "")
        methodology = extraction.get("methodology", {})
        results = extraction.get("results", {})
        contributions = extraction.get("contributions", [])
        limitations = extraction.get("limitations", [])

        prompt = f"""Analyze this research paper and extract a knowledge graph of entities and their relationships.

PAPER TEXT (excerpt):
{paper_text[:10000]}

EXTRACTED TITLE: {title}
METHODOLOGY: {str(methodology)[:1500]}
RESULTS: {str(results)[:1500]}
CONTRIBUTIONS: {str(contributions)[:500]}
LIMITATIONS: {str(limitations)[:500]}

Extract entities (concepts, methods, datasets, metrics, tools, findings) and their relationships.

Return a JSON object:
{{
    "nodes": [
        {{
            "id": "unique_snake_case_id",
            "label": "Human Readable Name",
            "type": "concept|method|dataset|metric|tool|finding",
            "importance": 8,
            "description": "Brief description of this entity in the paper's context"
        }}
    ],
    "edges": [
        {{
            "source": "source_node_id",
            "target": "target_node_id",
            "label": "relationship label (e.g. uses, improves, evaluates_on, achieves, extends, contradicts, compares_to, produces, requires)",
            "strength": 0.85
        }}
    ],
    "clusters": [
        {{
            "name": "Cluster name (e.g. Core Methodology, Evaluation, Data Pipeline)",
            "node_ids": ["id1", "id2"]
        }}
    ],
    "summary": "One paragraph describing the key relationships in this knowledge graph"
}}

IMPORTANT RULES:
- Extract 15-30 nodes for a rich graph
- Every node must have at least one edge
- Use consistent IDs across nodes and edges
- Importance is 1-10 where 10 is the most central concept
- Strength is 0.0-1.0 where 1.0 is the strongest relationship
- Include the paper's main contribution as the highest-importance node
- Group related nodes into 3-5 clusters
"""
        return await generate_json(
            prompt,
            system_instruction="You are a knowledge graph extraction specialist. Extract precise, meaningful entities and relationships from research papers. Ensure every node ID used in edges exists in the nodes list. Be thorough but avoid redundancy.",
            agent_name=self.name,
        )
