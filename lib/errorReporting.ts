export type ErrorReportPayload = {
  message: string;
  digest?: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
};

// Bounds applied client-side before the payload ever leaves the browser.
// The server enforces its own caps independently; these just keep the
// request small and predictable.
const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_LENGTH = 4000;

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max) + "..." : value;
}

/**
 * Builds the error report payload contract: message, digest, stack, URL,
 * user agent, and timestamp. Deliberately excludes cookies, authorization
 * headers, and request bodies, even if those happen to be present as
 * properties on the Error instance.
 */
export function buildErrorReportPayload(
  error: (Error & { digest?: string }) | null | undefined,
): ErrorReportPayload {
  const message = truncate(
    String(error?.message ?? "Unknown error"),
    MAX_MESSAGE_LENGTH,
  );
  const stack = error?.stack
    ? truncate(String(error.stack), MAX_STACK_LENGTH)
    : undefined;
  const digest = error?.digest ? String(error.digest) : undefined;

  return {
    message,
    digest,
    stack,
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sends a client-render error to the reporting endpoint. Best-effort: it
 * must never itself throw and interrupt the error boundary it is called
 * from.
 */
export async function reportClientError(
  error: (Error & { digest?: string }) | null | undefined,
): Promise<void> {
  try {
    const payload = buildErrorReportPayload(error);
    await fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Reporting is best-effort only.
  }
}
