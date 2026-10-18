"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { adminPost, type Run } from "./types";

type Summary = { feeds: string[]; examined: number; published: number; review: number; rejected: number; errors: unknown[] };

export default function RunsPanel({ runs, onRan }: { runs: Run[]; onRan: () => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setPending(true);
    setMessage("Crawling archives — this takes about a minute and a half…");
    try {
      const { summary } = await adminPost<{ summary: Summary }>({ action: "run-discovery" });
      setMessage(`${summary.examined} files checked in ${summary.feeds.length} feeds: ${summary.published} published, ${summary.review} for review, ${summary.rejected} rejected${summary.errors.length ? `, ${summary.errors.length} feed errors` : ""}.`);
      onRan();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Discovery failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">Discovery runs automatically every day at 19:00 UTC. Each run continues through the composer feeds where the previous one stopped.</p>
        <button type="button" onClick={run} disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Run discovery now
        </button>
      </div>
      {message && <p role="status" className="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm">{message}</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr><th className="py-2 font-medium">Started</th><th className="font-medium">Trigger</th><th className="font-medium">Feeds</th><th className="font-medium">Checked</th><th className="font-medium">Published</th><th className="font-medium">Review</th><th className="font-medium">Rejected</th><th className="font-medium">Errors</th></tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {runs.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted">No runs yet.</td></tr>}
            {runs.map((item) => (
              <tr key={item.id}>
                <td className="py-2">{new Date(item.started_at).toLocaleString()}</td>
                <td>{item.trigger}</td>
                <td title={item.feeds.join(", ")}>{item.feeds.length}</td>
                <td>{item.examined}</td>
                <td className="font-semibold text-accent">{item.published}</td>
                <td>{item.review}</td>
                <td>{item.rejected}</td>
                <td title={item.errors.map((error) => `${error.feed}: ${error.error}`).join("\n")} className={item.errors.length ? "text-accent" : "text-muted"}>
                  {item.finished_at ? item.errors.length : "cut off"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
