import { type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const PROXY_TIMEOUT_MS = 180_000;

const SKIP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = { params: Promise<{ path: string[] }> };

function buildResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  upstream.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<Response> {
  const path = pathSegments.join("/");
  const targetUrl = `${BACKEND_URL}/api/v1/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection") {
      return;
    }
    headers.set(key, value);
  });

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const response = await fetch(targetUrl, init);
  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildResponseHeaders(response.headers),
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
