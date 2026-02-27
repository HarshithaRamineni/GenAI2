"""Dual-model Cerebras LLM service — primary (gpt-oss-120b) + support (qwen-3-235b)."""

from cerebras.cloud.sdk import Cerebras
from app.config import get_settings
import json
import re
import asyncio

# Two separate clients for dual-model architecture
_primary_client = None   # gpt-oss-120b
_support_client = None   # qwen-3-235b

PRIMARY_MODEL = "gpt-oss-120b"
SUPPORT_MODEL = "qwen-3-235b-a22b-instruct-2507"

# Agents routed to the support model (lighter/faster tasks)
SUPPORT_MODEL_AGENTS = {
    "simplifier",
    "knowledge_graph",
    "plagiarism_checker",
    "peer_review",
}


def _get_primary_client():
    global _primary_client
    if _primary_client is None:
        settings = get_settings()
        _primary_client = Cerebras(api_key=settings.cerebras_api_key)
    return _primary_client


def _get_support_client():
    global _support_client
    if _support_client is None:
        settings = get_settings()
        key = settings.cerebras_api_key_secondary or settings.cerebras_api_key
        _support_client = Cerebras(api_key=key)
    return _support_client


def get_model_for_agent(agent_name: str) -> tuple:
    """Return (client, model_name) for a given agent."""
    if agent_name in SUPPORT_MODEL_AGENTS:
        return _get_support_client(), SUPPORT_MODEL
    return _get_primary_client(), PRIMARY_MODEL


async def generate(
    prompt: str,
    system_instruction: str = "",
    agent_name: str = "",
) -> str:
    """Generate text using the appropriate model based on agent routing."""
    try:
        client, model = get_model_for_agent(agent_name)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        def _call():
            response = client.chat.completions.create(
                messages=messages,
                model=model,
                max_completion_tokens=16384,
                temperature=0.7,
                top_p=0.9,
            )
            return response.choices[0].message.content

        return await asyncio.to_thread(_call)
    except Exception as e:
        error_msg = str(e)
        # Fallback: if support model fails, try primary
        if agent_name in SUPPORT_MODEL_AGENTS:
            try:
                fallback_client = _get_primary_client()
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                def _fallback():
                    response = fallback_client.chat.completions.create(
                        messages=messages,
                        model=PRIMARY_MODEL,
                        max_completion_tokens=16384,
                        temperature=0.7,
                        top_p=0.9,
                    )
                    return response.choices[0].message.content

                return await asyncio.to_thread(_fallback)
            except Exception:
                pass
        if "API key" in error_msg or "auth" in error_msg.lower():
            raise RuntimeError(
                "Invalid Cerebras API key. Check CEREBRAS_API_KEY in .env"
            ) from e
        raise RuntimeError(f"Cerebras API error: {error_msg}") from e


async def generate_json(
    prompt: str,
    system_instruction: str = "",
    agent_name: str = "",
) -> dict:
    """Generate and parse JSON from Cerebras response."""
    system_instruction += "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no extra text."
    text = await generate(prompt, system_instruction, agent_name=agent_name)
    text = text.strip()
    # Remove markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        return {"raw_response": text, "parse_error": True}
