"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errorReporting";

// Root-level boundary: it replaces the entire root layout, so it must
// supply its own <html> and <body> and cannot rely on providers, styles,
// or hooks that assume the normal layout tree is mounted.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "sans-serif",
          background: "#f7f4ee",
          color: "#251d21",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#766d6f",
          }}
        >
          Something went sideways
        </p>
        <h1 style={{ fontSize: 24, margin: 0 }}>
          The app hit an unexpected error
        </h1>
        <p style={{ fontSize: 14, maxWidth: 420, color: "#57504f" }}>
          We&apos;ve quietly noted this. You can try reloading, or go back to
          where you were.
        </p>
        {error.digest && (
          <p
            style={{
              userSelect: "all",
              background: "#eee9df",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            Reference: {error.digest}
          </p>
        )}
        {error.message && (
          <p
            style={{
              userSelect: "all",
              background: "#eee9df",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            {error.message}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: 999,
              background: "#a74735",
              color: "white",
              border: 0,
              padding: "0.5rem 1rem",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              borderRadius: 999,
              border: "1px solid #d6d0c9",
              background: "transparent",
              padding: "0.5rem 1rem",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </body>
    </html>
  );
}
