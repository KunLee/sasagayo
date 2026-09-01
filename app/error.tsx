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
      <p className="micro-label text-stone-500">Something went sideways</p>
      <h1 className="font-serif text-2xl">We hit a snag loading this page</h1>
      <p className="text-sm text-stone-600">
        The moment has been noted quietly on our end. You can try again, or
        head back to where you were.
      </p>
      {error.digest && (
        <p className="select-all rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">
          Reference: {error.digest}
        </p>
      )}
      {error.message && (
        <p className="select-all rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">
          {error.message}
        </p>
      )}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-[#a74735] px-4 py-2 text-xs font-semibold text-white"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
}
