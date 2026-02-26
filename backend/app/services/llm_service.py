"""Google Gemini LLM service wrapper."""

import google.generativeai as genai
from app.config import get_settings
import json
import re


_model = None


def _get_model():
    global _model
    if _model is None:
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel("gemini-2.0-flash")
    return _model


async def generate(prompt: str, system_instruction: str = "") -> str:
    """Generate text using Gemini."""
    try:
        model = _get_model()
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = await model.generate_content_async(full_prompt)
        return response.text
    except Exception as e:
        error_msg = str(e)
        if "API key not valid" in error_msg:
            raise RuntimeError(
                "Invalid Gemini API key. Please check your GEMINI_API_KEY in .env"
            ) from e
        raise RuntimeError(f"Gemini API error: {error_msg}") from e


async def generate_json(prompt: str, system_instruction: str = "") -> dict:
    """Generate and parse JSON from Gemini response."""
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
