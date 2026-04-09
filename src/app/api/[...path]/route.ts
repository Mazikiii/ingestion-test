const DEFAULT_BACKEND_API_URL = "http://127.0.0.1:4000";
const BACKEND_API_URL =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  DEFAULT_BACKEND_API_URL;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildTargetUrl(request: Request, pathParts: string[]): string {
  const incomingUrl = new URL(request.url);
  const requestPath = pathParts.length ? `/${pathParts.join("/")}` : "";
  const backendBase = normalizeBaseUrl(BACKEND_API_URL);
  return `${backendBase}${requestPath}${incomingUrl.search}`;
}

function buildUpstreamHeaders(request: Request): Headers {
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);
  if (accept) headers.set("accept", accept);

  return headers;
}

function buildDownstreamHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers();

  upstreamHeaders.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

async function readBodyIfNeeded(request: Request, method: string): Promise<ArrayBuffer | undefined> {
  if (method === "GET" || method === "HEAD") {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

async function proxyRequest(request: Request, context: RouteContext, method: string) {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(request, path);
  console.error(`[PROXY] ${method} ${path.join("/")} -> ${targetUrl}`);

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: buildUpstreamHeaders(request),
      body: await readBodyIfNeeded(request, method),
      cache: "no-store",
      redirect: "manual",
    });

    const body = await upstream.arrayBuffer();
    const responseHeaders = buildDownstreamHeaders(upstream.headers);

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return Response.json(
      {
        error: "Failed to reach backend API.",
        target: targetUrl,
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "GET");
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "POST");
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "PATCH");
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "PUT");
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "DELETE");
}

export async function OPTIONS(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "OPTIONS");
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxyRequest(request, context, "HEAD");
}
