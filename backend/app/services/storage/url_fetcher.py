import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

import httpx

from app.core.exceptions import SSRFError, URLFetchError
from app.services.storage.html_extractor import extract_text_from_html

PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return any(ip in private_range for private_range in PRIVATE_RANGES)


async def _resolve_host_ips(hostname: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    try:
        addr_infos = await asyncio.to_thread(
            socket.getaddrinfo,
            hostname,
            443,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise URLFetchError() from exc

    ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for info in addr_infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip not in ips:
            ips.append(ip)
    return ips


def _validate_resolved_ips(
    ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address],
) -> None:
    for ip in ips:
        if _is_blocked_ip(ip):
            raise SSRFError()


async def fetch_jd_url(url: str, client: httpx.AsyncClient | None = None) -> str:
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise SSRFError()

    hostname = parsed.hostname
    if not hostname:
        raise SSRFError()

    try:
        literal_ip = ipaddress.ip_address(hostname)
        if _is_blocked_ip(literal_ip):
            raise SSRFError()
    except ValueError:
        resolved_ips = await _resolve_host_ips(hostname)
        if not resolved_ips:
            raise URLFetchError()
        _validate_resolved_ips(resolved_ips)

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=10.0, follow_redirects=False)

    try:
        response = await http_client.get(url)
        response.raise_for_status()
        return extract_text_from_html(response.text)
    except httpx.TimeoutException as exc:
        raise URLFetchError() from exc
    except httpx.HTTPError as exc:
        raise URLFetchError() from exc
    finally:
        if owns_client:
            await http_client.aclose()
