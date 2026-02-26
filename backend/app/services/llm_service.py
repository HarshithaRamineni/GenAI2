"""Cerebras LLM service wrapper."""

from cerebras.cloud.sdk import Cerebras
from app.config import get_settings
import json
import re
import asyncio


_client = None


def _get_client():
    global _client
    if _client is None:
        settings = get_settings()
        _client = Cerebras(api_key=settings.cerebras_api_key)
    return _client


async def generate(prompt: str, system_instruction: str = "") -> str:
    """Generate text using Cerebras gpt-oss-120b."""
    try:
        client = _get_client()
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        # Run synchronous SDK call in a thread to keep async compatibility
        def _call():
            response = client.chat.completions.create(
                messages=messages,
                model="gpt-oss-120b",
                max_completion_tokens=32768,
                temperature=1,
                top_p=1,
            )
            return response.choices[0].message.content

        return await asyncio.to_thread(_call)
    except Exception as e:
        error_msg = str(e)
        if "API key" in error_msg or "auth" in error_msg.lower():
            raise RuntimeError(
                "Invalid Cerebras API key. Please check your CEREBRAS_API_KEY in .env"
            ) from e
        raise RuntimeError(f"Cerebras API error: {error_msg}") from e


async def generate_json(prompt: str, system_instruction: str = "") -> dict:
    """Generate and parse JSON from Cerebras response."""
    system_instruction += "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no extra text."
    text = await generate(prompt, system_instruction)
    # Try to extract JSON from response
    text = text.strip()
    # Remove markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        return {"raw_response": text, "parse_error": True}
