import os

import httpx
import pytest

pytestmark = pytest.mark.e2e


@pytest.mark.skipif(
    os.getenv("RUN_E2E") != "1",
    reason="Set RUN_E2E=1 with docker compose running to execute e2e tests.",
)
@pytest.mark.asyncio
async def test_healthz_against_running_stack() -> None:
    base_url = os.getenv("E2E_BASE_URL", "http://localhost:8000")

    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        response = await client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
