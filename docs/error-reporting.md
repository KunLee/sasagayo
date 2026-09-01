# Client-side error reporting

This document describes the error-reporting mechanism added for the App
Router boundaries (`app/error.tsx`, `app/global-error.tsx`) and its backing
endpoint.

## Report payload shape

Defined in `lib/errorReporting.ts` as `ErrorReportPayload`:

| Field       | Type   | Notes                                             |
|-------------|--------|----------------------------------------------------|
| `message`   | string | Human-readable error message, truncated to 4000 chars. |
| `digest`    | string? | Next.js error digest, if the error boundary supplied one. |
| `stack`     | string? | Error stack trace, if available, truncated to 4000 chars. |
| `url`       | string | `window.location.href` at the time of the error.  |
| `userAgent` | string | `navigator.userAgent` at the time of the error.   |
| `timestamp` | string | ISO-8601 timestamp, set client-side.              |

**Explicitly excluded, always:** cookies, authorization headers, and request
bodies. Nothing else is ever added to this payload, even if present on the
`Error` object being reported — `buildErrorReportPayload` only ever reads
`message` and `stack` off the error and otherwise sources fields from the
browser environment.

## Client helper

`reportClientError(error, digest)` (in `lib/errorReporting.ts`) builds the
payload above and POSTs it to `/api/errors`, preferring `navigator.sendBeacon`
(so it can fire during unload) and falling back to a `keepalive` `fetch`. It
never throws, so it is safe to call unconditionally from inside a render
error boundary.

## Endpoint: `POST /api/errors`

Implemented in `app/api/errors/route.ts`.

- **No authentication required.** Error boundaries must be able to report
  failures that occur before any session/auth context exists (e.g. a crash
  during initial layout render), so this endpoint is intentionally open.
- **Size cap:** requests are rejected with `413` if `Content-Length` or the
  actual body exceeds 20 KB.
- **Rate limit:** a simple in-memory, per-client-IP limiter allows at most 20
  reports per rolling 60-second window per IP; excess requests get `429`.
  This resets on process restart/redeploy and is not shared across
  instances — it is a best-effort abuse guard, not a precise global limiter.
- **Validation/sanitization:** only the fields in the contract above are ever
  read from the request body (arbitrary/extra fields are ignored); each
  string field is trimmed and length-capped; a non-empty `message` is
  required or the request is rejected with `400`.
- **Where reports land:** validated reports are currently logged via
  `console.error("[client-error-report]", report)`, which flows into
  whatever platform/log aggregation already captures server console output.
  If a dedicated error-tracking service is introduced later, this is the
  single place to forward reports to it instead of (or in addition to)
  `console.error`.

## UI boundaries

- `app/error.tsx` — segment-level boundary. Reports the error/digest on
  mount, shows a calm message with the digest and error message in
  selectable/copyable `<code>` blocks, and offers Reload (calls the
  boundary's `reset()`) and Back (`window.history.back()`).
- `app/global-error.tsx` — root-level boundary. Same reporting and calm UI
  pattern, but supplies its own `<html>`/`<body>` and inline styles since it
  replaces the root layout (and therefore cannot assume the normal
  stylesheet pipeline, providers, or Header/Footer are available).
- `app/not-found.tsx` — deliberately distinct: no digest, no message, no
  call into the error-reporting path, since a missing route is routine
  behavior rather than a render error.
