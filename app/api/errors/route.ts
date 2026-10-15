import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Bounds for this deliberately unauthenticated endpoint. Error boundaries
// must be able to report before any session/auth context exists, so the
// only defenses available are a hard size cap and a simple per-IP rate
// limit, plus strict field allow-listing/sanitization below.
const MAX_BODY_BYTES = 20_000;
const MAX_STRING_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

type ReportRecord = { count: number; windowStart: number };

// In-memory, best-effort rate limiter keyed by client IP. This resets on
// redeploy/restart and is not shared across instances — acceptable for a
// bounding mechanism whose purpose is to blunt abuse, not to be a precise
// global limiter.
const requestLog = new Map<string, ReportRecord>();

function isRateLimited(key: string) {
  const now = Date.now();
  const record = requestLog.get(key);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(key, { count: 1, windowStart: now });
    return false;
  }
  record.count += 1;
  return record.count > RATE_LIMIT_MAX_REQUESTS;
}

function clientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function sanitizeString(value: unknown, max: number = MAX_STRING_LENGTH) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

/**
 * Accepts client-side error reports without requiring authentication.
 *
 * Bounding rules:
 *  - `Content-Length` (when present) and the actual body size are both
 *    capped at MAX_BODY_BYTES; oversized reports are rejected with 413.
 *  - Requests are rate-limited per client IP to RATE_LIMIT_MAX_REQUESTS per
 *    RATE_LIMIT_WINDOW_MS; excess requests get 429.
 *  - Only the fields defined by the report contract (message, digest,
 *    stack, url, userAgent, timestamp) are ever read from the body; cookies,
 *    authorization headers, and any other request data are never persisted.
 *
 * Reports are currently forwarded to the platform logger (`console.error`),
 * which is captured by the existing hosting/log infrastructure. Swap this
 * for a dedicated error-tracking sink here if one is introduced later.
 */
export async function POST(request: NextRequest) {
  const key = clientKey(request);
  if (isRateLimited(key))
    return NextResponse.json({ error: "Too many reports." }, { status: 429 });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "Report is too large." },
      { status: 413 },
    );

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "Report is too large." },
      { status: 413 },
    );

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });

  const input = body as Record<string, unknown>;
  const message = sanitizeString(input.message);
  if (!message)
    return NextResponse.json(
      { error: "A message is required." },
      { status: 400 },
    );

  const report = {
    message,
    digest: sanitizeString(input.digest, 200),
    stack: sanitizeString(input.stack, MAX_STRING_LENGTH),
    url: sanitizeString(input.url, 2000),
    userAgent: sanitizeString(input.userAgent, 500),
    timestamp: sanitizeString(input.timestamp, 64) ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };

  console.error("[client-error-report]", report);

  return NextResponse.json({ ok: true }, { status: 202 });
}
