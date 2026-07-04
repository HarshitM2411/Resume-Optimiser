import asyncio
import json
import re
from collections.abc import Callable
from json import JSONDecodeError
from typing import Any, TypeVar

from groq import AsyncGroq
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.exceptions import LLMExhaustedError

T = TypeVar("T")

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)


class LLMClient:
    MAX_RETRIES = 3
    BASE_DELAY = 1.0

    def __init__(self, client: AsyncGroq | None = None) -> None:
        settings = get_settings()
        self._settings = settings
        self._client = client or AsyncGroq(api_key=settings.groq_api_key)

    async def call(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        validate: Callable[[dict[str, Any]], T] | None = None,
    ) -> T | dict[str, Any]:
        prompt = user_prompt
        last_error: Exception | None = None

        for attempt in range(self.MAX_RETRIES):
            try:
                response = await self._client.chat.completions.create(
                    model=self._settings.groq_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0,
                    response_format={"type": "json_object"},
                )
                content = response.choices[0].message.content or ""
                parsed = self._parse_json(content)
                if validate is None:
                    return parsed
                return validate(parsed)
            except (ValidationError, JSONDecodeError) as exc:
                last_error = exc
                if attempt == self.MAX_RETRIES - 1:
                    break
                prompt = self._append_error(prompt, exc)
                await asyncio.sleep(self.BASE_DELAY * (2**attempt))

        raise LLMExhaustedError() from last_error

    def _parse_json(self, content: str) -> dict[str, Any]:
        stripped = content.strip()
        fence_match = _JSON_FENCE_RE.search(stripped)
        if fence_match:
            stripped = fence_match.group(1).strip()

        data = json.loads(stripped)
        if not isinstance(data, dict):
            raise JSONDecodeError("Expected a JSON object.", stripped, 0)
        return data

    def _append_error(self, prompt: str, error: Exception) -> str:
        return (
            f"{prompt}\n\n"
            "Your previous response failed validation. "
            f"Error: {error}\n"
            "Return only valid JSON matching the required schema."
        )
