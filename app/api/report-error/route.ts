import { NextRequest, NextResponse } from "next/server";

// Unauthenticated on purpose: errors can happen before any session exists.
// Bounded instead by a body size cap and a simple per-IP rate limit.
export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_FIELD_LENGTH = 4000;

const hits = new Map<string, { count: number; windowStart: number }>();

function clientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function sanitizeString(value: unknown, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  if (isRateLimited(key))
    return NextResponse.json({ error: "Too many reports." }, { status: 429 });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES)
    return NextResponse.json({ error: "Report too large." }, { status: 413 });

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (rawBody.length > MAX_BODY_BYTES)
    return NextResponse.json({ error: "Report too large." }, { status: 413 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!parsed || typeof parsed !== "object")
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });

  const body = parsed as Record<string, unknown>;

  // Only these bounded, sanitized fields are ever kept. Cookies, auth
  // headers, and arbitrary request bodies are never read from or forwarded
  // to this handler's own payload.
  const report = {
    message: sanitizeString(body.message) ?? "Unknown error",
    digest: sanitizeString(body.digest, 200),
    stack: sanitizeString(body.stack, 4000),
    url: sanitizeString(body.url, 2000),
    userAgent: sanitizeString(body.userAgent, 500),
    timestamp: sanitizeString(body.timestamp, 64) ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };

  // Forwarded to existing logging infrastructure (stdout, picked up by the
  // platform's log pipeline). Swap for a dedicated error tracker call here
  // if/when one is wired up.
  console.error("[client-error-report]", report);

  return NextResponse.json({ ok: true }, { status: 202 });
}
