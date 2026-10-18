"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import PublishingPanel from "./PublishingPanel";
import RunsPanel from "./RunsPanel";
import TrackDesk from "./TrackDesk";
import UsersPanel from "./UsersPanel";
import type { Overview } from "./types";

const TABS = [
  { id: "incoming", label: "Incoming" },
  { id: "review", label: "Review queue" },
  { id: "library", label: "All music" },
  { id: "publishing", label: "Publishing" },
  { id: "users", label: "Users" },
  { id: "runs", label: "Discovery runs" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function AdminClient() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("incoming");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin?view=overview", { cache: "no-store" });
    if (!response.ok) { setError((await response.json().catch(() => ({}))).error ?? "The editor desk is unavailable."); return; }
    setOverview(await response.json());
  }, []);

  useEffect(() => {
    // Initial load once the editor is known; refresh() sets state when the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session.isEditor) void refresh();
  }, [session.isEditor, refresh]);

  if (session.loading) return <Centered><LoaderCircle className="size-6 animate-spin text-muted" /></Centered>;
  if (!session.account) {
    return (
      <Centered>
        <p className="eyebrow">Editor desk</p>
        <h1 className="display mt-3 text-5xl">Editors only</h1>
        <p className="mt-4 text-sm text-muted">Sign in with an editor account to review incoming music.</p>
        <Link href="/signin?next=/admin" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper">Sign in</Link>
      </Centered>
    );
  }
  if (!session.isEditor) {
    return <Centered><h1 className="display text-4xl">Editors only</h1><p className="mt-4 text-sm text-muted">{session.account.email} is a listener account. Ask an editor to grant you access.</p></Centered>;
  }

  const lastRun = overview?.runs[0];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Editor desk</p>
          <h1 className="display mt-3 text-5xl">Library desk</h1>
          {overview && (
            <p className="mt-2 text-sm text-muted">
              Publishing is <strong className="text-ink-2">{overview.policy.mode === "auto" ? `automatic at ${overview.policy.publishAt}+` : "manual"}</strong>
              {" · "}{overview.feeds.crawled}/{overview.feeds.known || "—"} feeds visited
              {lastRun ? ` · last run ${new Date(lastRun.started_at).toLocaleString()}` : ""}
            </p>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</p>}

      {overview && (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            ["Arrived in 24 h", Object.values(overview.incoming).reduce((sum, value) => sum + value, 0), "incoming"],
            ["Waiting for review", overview.totals.review, "review"],
            ["Published", overview.totals.published, "library"],
            ["Rejected or hidden", overview.totals.rejected + overview.totals.hidden, "library"],
          ] as const).map(([label, value, target]) => (
            <button key={label} type="button" onClick={() => setTab(target)} className="rounded-2xl border border-line bg-card p-4 text-left transition hover:border-accent">
              <span className="block font-serif text-3xl tabular-nums">{value.toLocaleString("en")}</span>
              <span className="text-xs text-muted">{label}</span>
            </button>
          ))}
        </div>
      )}

      <nav aria-label="Editor sections" className="scrollbar-none mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm transition ${tab === item.id ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {item.label}
            {item.id === "review" && overview?.totals.review ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-ink">{overview.totals.review}</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "incoming" && <TrackDesk key="incoming" preset={{ since: "24h", status: "all", sort: "score" }} onChange={refresh} intro="Everything discovery found in the last 24 hours, best first. Check what was published automatically and decide on the rest." />}
        {tab === "review" && <TrackDesk key="review" preset={{ since: "all", status: "review", sort: "score" }} onChange={refresh} intro="Recordings waiting for a human decision. Listen, then publish or reject." />}
        {tab === "library" && <TrackDesk key="library" preset={{ since: "all", status: "published", sort: "newest" }} onChange={refresh} />}
        {tab === "publishing" && overview && <PublishingPanel policy={overview.policy} onSaved={refresh} />}
        {tab === "users" && <UsersPanel />}
        {tab === "runs" && <RunsPanel runs={overview?.runs ?? []} onRan={refresh} />}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid min-h-[55vh] max-w-md place-content-center px-4 text-center">{children}</div>;
}
