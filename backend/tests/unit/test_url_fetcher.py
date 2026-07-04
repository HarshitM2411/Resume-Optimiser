import socket
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.core.exceptions import SSRFError, URLFetchError
from app.services.storage.url_fetcher import fetch_jd_url

BLOCKED_IPS = [
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "127.0.0.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
]


def _addr_info_for_ip(ip: str) -> list[tuple]:
    family = socket.AF_INET6 if ":" in ip else socket.AF_INET
    return [(family, socket.SOCK_STREAM, 6, "", (ip, 443))]


@pytest.mark.parametrize("blocked_ip", BLOCKED_IPS)
@pytest.mark.asyncio
async def test_blocks_private_and_metadata_ips(blocked_ip: str) -> None:
    with patch(
        "app.services.storage.url_fetcher.socket.getaddrinfo",
        return_value=_addr_info_for_ip(blocked_ip),
    ):
        with pytest.raises(SSRFError):
            await fetch_jd_url("https://example.com/jobs/123")


@pytest.mark.asyncio
async def test_blocks_non_https_urls() -> None:
    with pytest.raises(SSRFError):
        await fetch_jd_url("http://example.com/jobs/123")


@pytest.mark.asyncio
async def test_blocks_literal_private_ip_in_url() -> None:
    with pytest.raises(SSRFError):
        await fetch_jd_url("https://127.0.0.1/jobs/123")


@pytest.mark.asyncio
async def test_blocks_cloud_metadata_literal_ip() -> None:
    with pytest.raises(SSRFError):
        await fetch_jd_url("https://169.254.169.254/latest/meta-data/")


@pytest.mark.asyncio
async def test_handles_request_timeout() -> None:
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timed out"))

    with patch(
        "app.services.storage.url_fetcher.socket.getaddrinfo",
        return_value=_addr_info_for_ip("93.184.216.34"),
    ):
        with pytest.raises(URLFetchError):
            await fetch_jd_url("https://example.com/jobs/123", client=mock_client)


@pytest.mark.asyncio
async def test_fetches_public_https_url() -> None:
    mock_response = MagicMock()
    mock_response.text = "<html><body><h1>Backend Engineer</h1></body></html>"
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.storage.url_fetcher.socket.getaddrinfo",
        return_value=_addr_info_for_ip("93.184.216.34"),
    ):
        text = await fetch_jd_url("https://example.com/jobs/123", client=mock_client)

    assert "Backend Engineer" in text
    mock_client.get.assert_awaited_once_with("https://example.com/jobs/123")


@pytest.mark.asyncio
async def test_raises_when_dns_resolution_fails() -> None:
    with patch(
        "app.services.storage.url_fetcher.socket.getaddrinfo",
        side_effect=socket.gaierror("Name or service not known"),
    ):
        with pytest.raises(URLFetchError):
            await fetch_jd_url("https://missing.example/jobs/123")
