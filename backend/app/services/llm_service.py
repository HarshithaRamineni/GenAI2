"""Dual-model LLM service on Groq — primary (gpt-oss-120b) + support (qwen3-32b).

Groq exposes an OpenAI-compatible API, so the official `openai` client is used
with Groq's base URL.
"""

from openai import OpenAI
from app.config import get_settings
import json
import re
import asyncio

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Two separate clients for dual-model architecture
_primary_client = None   # gpt-oss-120b
_support_client = None   # qwen3-32b

PRIMARY_MODEL = "openai/gpt-oss-120b"
SUPPORT_MODEL = "qwen/qwen3-32b"

# Agents routed to the support model (lighter/faster tasks)
SUPPORT_MODEL_AGENTS = {
    "simplifier",
    "knowledge_graph",
    "plagiarism_checker",
    "peer_review",
}


def _make_client():
    settings = get_settings()
    return OpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)


def _get_primary_client():
    global _primary_client
    if _primary_client is None:
        _primary_client = _make_client()
    return _primary_client


def _get_support_client():
    global _support_client
    if _support_client is None:
        _support_client = _make_client()
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
        if "401" in error_msg or "invalid_api_key" in error_msg.lower() or "api key" in error_msg.lower():
            raise RuntimeError(
                "Invalid Groq API key. Check GROQ_API_KEY in .env"
            ) from e
        raise RuntimeError(f"Groq API error: {error_msg}") from e


async def generate_json(
    prompt: str,
    system_instruction: str = "",
    agent_name: str = "",
) -> dict:
    """Generate and parse JSON from the LLM response."""
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