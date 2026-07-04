from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import LLMExhaustedError
from app.models.domain.resume import ResumeSchema
from app.services.llm.client import LLMClient
from app.services.llm.resume_parser import ResumeParser


VALID_RESUME = {
    "contact": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": None,
        "location": "NYC",
        "linkedin": None,
        "github": None,
        "website": None,
    },
    "summary": "Backend engineer",
    "work_experience": [],
    "education": [],
    "skills": {
        "languages": ["Python"],
        "frameworks": ["FastAPI"],
        "tools": [],
        "other": [],
    },
    "projects": [],
    "achievements": [],
    "certifications": [],
}


@pytest.mark.asyncio
async def test_resume_parser_returns_valid_schema() -> None:
    mock_client = AsyncMock(spec=LLMClient)
    mock_client.call = AsyncMock(return_value=ResumeSchema.model_validate(VALID_RESUME))

    parser = ResumeParser(llm_client=mock_client)
    result = await parser.parse("Jane Doe\njane@example.com")

    assert result.contact.name == "Jane Doe"
    mock_client.call.assert_awaited_once()
    _, kwargs = mock_client.call.await_args
    assert "Jane Doe" in kwargs["user_prompt"]


@pytest.mark.asyncio
async def test_llm_client_retries_on_validation_error() -> None:
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create = AsyncMock(
        side_effect=[
            _completion('{"contact": {"name": "Jane"}}'),
            _completion(_json(VALID_RESUME)),
        ]
    )

    client = LLMClient(client=mock_groq)
    client.BASE_DELAY = 0

    result = await client.call(
        system_prompt="system",
        user_prompt="user",
        validate=ResumeSchema.model_validate,
    )

    assert isinstance(result, ResumeSchema)
    assert mock_groq.chat.completions.create.await_count == 2
    second_call = mock_groq.chat.completions.create.await_args_list[1]
    assert second_call.kwargs["model"] == "llama-3.3-70b-versatile"


@pytest.mark.asyncio
async def test_llm_client_raises_after_three_failed_validations() -> None:
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create = AsyncMock(
        return_value=_completion('{"contact": {"name": "Jane"}}')
    )

    client = LLMClient(client=mock_groq)
    client.BASE_DELAY = 0

    with pytest.raises(LLMExhaustedError):
        await client.call(
            system_prompt="system",
            user_prompt="user",
            validate=ResumeSchema.model_validate,
        )

    assert mock_groq.chat.completions.create.await_count == 3


@pytest.mark.asyncio
async def test_llm_client_retries_on_invalid_json() -> None:
    mock_groq = AsyncMock()
    mock_groq.chat.completions.create = AsyncMock(
        side_effect=[
            _completion("not-json"),
            _completion(_json(VALID_RESUME)),
        ]
    )

    client = LLMClient(client=mock_groq)
    client.BASE_DELAY = 0

    result = await client.call(
        system_prompt="system",
        user_prompt="user",
        validate=ResumeSchema.model_validate,
    )

    assert isinstance(result, ResumeSchema)
    assert mock_groq.chat.completions.create.await_count == 2


def _completion(content: str) -> object:
    class Message:
        def __init__(self, value: str) -> None:
            self.content = value

    class Choice:
        def __init__(self, value: str) -> None:
            self.message = Message(value)

    class Response:
        def __init__(self, value: str) -> None:
            self.choices = [Choice(value)]

    return Response(content)


def _json(payload: dict) -> str:
    import json

    return json.dumps(payload)
