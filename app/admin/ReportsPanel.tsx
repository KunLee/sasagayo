"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { adminPost } from "./types";

type Report = {
  id: string; reason: string; status: "open" | "resolved" | "dismissed"; created_at: string; reporter: string;
  target_id: string; target_handle: string; target_name: string; target_motto: string; target_bio: string;
  target_avatar: string | null; target_status: "active" | "suspended";
};

const MODERATION = [
  { action: "remove_avatar", label: "Remove picture", needs: (r: Report) => Boolean(r.target_avatar) },
  { action: "clear_text", label: "Clear name, motto & bio", needs: (r: Report) => Boolean(r.target_motto || r.target_bio || r.target_name !== "Listener") },
  { action: "reset_handle", label: "Reset username", needs: () => true },
] as const;

/** Profile reports from listeners, with clean-up actions. Every action asks for an audit reason. */
export default function ReportsPanel({ onChange }: { onChange: () => void }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin?view=reports", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setReports(data.reports ?? []);
    else setNotice(data.error ?? "Reports are unavailable.");
  }, []);

  useEffect(() => {
    // Initial load; state is set when the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function act(body: Record<string, unknown>, summary: string, askReason = true) {
    const reason = askReason ? window.prompt(`${summary}\n\nReason for the audit log:`, "") : "";
    if (reason === null) return;
    setBusy(true);
    try {
      await adminPost({ ...body, reason });
      setNotice(`${summary} — done.`);
      await load();
      onChange();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!reports) return <div className="grid h-40 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted" /></div>;
  const open = reports.filter((report) => report.status === "open");
  const closed = reports.filter((report) => report.status !== "open");

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted">Listeners can report a public profile. Review the picture and text, clean up what breaks the rules, then resolve or dismiss the report.</p>
      {notice && <p role="status" className="rounded-xl border border-line bg-card px-4 py-3 text-sm">{notice}</p>}
      {open.length === 0 && <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">No open reports.</p>}
      {open.map((report) => (
        <article key={report.id} className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-[auto_1fr]">
          <Avatar name={report.target_name} url={report.target_avatar} size={72} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-2">
              <a href={`/u/${report.target_handle}`} target="_blank" rel="noreferrer" className="font-serif text-2xl hover:text-accent hover:underline">{report.target_name}</a>
              <span className="text-sm text-muted">@{report.target_handle}</span>
              {report.target_status === "suspended" && <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-semibold uppercase">suspended</span>}
            </p>
            {report.target_motto && <p className="mt-1 font-serif italic text-ink-2">“{report.target_motto}”</p>}
            {report.target_bio && <p className="mt-1 line-clamp-3 text-sm text-muted">{report.target_bio}</p>}
            <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm">
              {report.reason}
              <footer className="mt-1 text-xs text-muted">— {report.reporter}, {new Date(report.created_at).toLocaleString()}</footer>
            </blockquote>
            <div className="mt-4 flex flex-wrap gap-2">
              {MODERATION.filter((item) => item.needs(report)).map((item) => (
                <button key={item.action} type="button" disabled={busy} onClick={() => act({ action: "moderate-profile", userId: report.target_id, moderation: item.action }, `${item.label} for @${report.target_handle}`)} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent hover:text-accent">
                  {item.label}
                </button>
              ))}
              {report.target_status === "active" && (
                <button type="button" disabled={busy} onClick={() => act({ action: "set-user-status", userId: report.target_id, status: "suspended" }, `Suspend @${report.target_handle}`)} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent hover:text-accent">
                  Suspend account
                </button>
              )}
              <span className="mx-1 w-px bg-line" aria-hidden />
              <button type="button" disabled={busy} onClick={() => act({ action: "resolve-report", reportId: report.id, status: "resolved" }, "Mark report resolved", false)} className="h-8 rounded-full bg-ink px-3 text-xs font-semibold text-paper hover:bg-accent hover:text-accent-ink">
                Resolved
              </button>
              <button type="button" disabled={busy} onClick={() => act({ action: "resolve-report", reportId: report.id, status: "dismissed" }, "Dismiss report", false)} className="h-8 rounded-full px-3 text-xs text-muted hover:text-accent">
                Dismiss
              </button>
            </div>
          </div>
        </article>
      ))}
      {closed.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Closed reports ({closed.length})</summary>
          <ul className="mt-3 divide-y divide-line">
            {closed.map((report) => (
              <li key={report.id} className="py-2 text-muted">
                <span className="text-ink">@{report.target_handle}</span> — {report.status} · {report.reason.slice(0, 120)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
