"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { reportClientError } from "@/lib/errorReporting";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    void reportClientError(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow">Something went sideways</p>
      <h1 className="display text-4xl">We hit a snag loading this page</h1>
      <p className="text-sm text-muted">
        The moment has been noted quietly on our end. You can try again, or
        head back to where you were.
      </p>
      {error.digest && (
        <p className="select-all rounded-lg bg-paper-2 px-3 py-2 text-xs text-muted">
          Reference: {error.digest}
        </p>
      )}
      {error.message && (
        <p className="select-all rounded-lg bg-paper-2 px-3 py-2 text-xs text-muted">
          {error.message}
        </p>
      )}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-line px-4 py-2 text-xs font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
}
