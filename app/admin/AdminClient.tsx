"use client";

import { ExternalLink, LoaderCircle, LogOut, Play, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { formatDuration } from "@/lib/format";

type Status = "review" | "published" | "rejected" | "hidden";
type AdminTrack = {
  id: string; title: string; composer_slug: string; composer_name: string; performer: string | null;
  duration_seconds: number; stream_url: string; source_page_url: string; license_name: string;
  quality_score: number; quality_notes: string[]; status: Status; discovered_at: string; play_count: number;
};
type Run = { id: string; trigger: string; started_at: string; finished_at: string | null; feeds: string[]; examined: number; published: number; review: number; rejected: number; errors: { feed: string; error: string }[] };
type Data = { counts: Record<Status, number>; tracks: AdminTrack[]; runs: Run[]; feeds: { crawled: number; known: number } };

const TABS: { status: Status; label: string }[] = [
  { status: "review", label: "Waiting for review" },
  { status: "published", label: "Published" },
  { status: "rejected", label: "Rejected" },
  { status: "hidden", label: "Hidden" },
];
const ACTIONS: Record<Status, { status: Status; label: string }[]> = {
  review: [{ status: "published", label: "Publish" }, { status: "rejected", label: "Reject" }],
  published: [{ status: "hidden", label: "Hide" }],
  rejected: [{ status: "published", label: "Publish" }],
  hidden: [{ status: "published", label: "Restore" }],
};

export default function AdminClient() {
  const player = usePlayer();
  const [state, setState] = useState<"loading" | "login" | "forbidden" | "ready" | "error">("loading");
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Status>("review");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (status: Status, q: string) => {
    const response = await fetch(`/api/admin?status=${status}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (response.status === 401) return setState("login");
    if (response.status === 403) return setState("forbidden");
    if (!response.ok) return setState("error");
    setData(await response.json());
    setSelected(new Set());
    setState("ready");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(tab, query), query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, tab, query]);

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Action failed.");
      setNotice(typeof success === "string" && result.summary
        ? `Discovery: ${result.summary.examined} files examined in ${result.summary.feeds.length} feeds — ${result.summary.published} published, ${result.summary.review} for review, ${result.summary.rejected} rejected.`
        : success);
      await load(tab, query);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <div className="grid min-h-[50vh] place-items-center"><LoaderCircle className="size-6 animate-spin text-muted" /></div>;
  if (state === "login") return <Login onSignedIn={() => { setState("loading"); void load(tab, query); }} />;
  if (state === "forbidden") return <Message title="Editors only" body="You are signed in, but this account does not have editor rights." signOut />;
  if (state === "error" || !data) return <Message title="The editor is unavailable" body="The database could not be reached. Check the server logs and try again." />;

  const tracks = data.tracks;
  const lastRun = data.runs[0];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Editor</p>
          <h1 className="display mt-3 text-5xl">Library desk</h1>
          <p className="mt-2 text-sm text-muted">
            {data.feeds.crawled} of {data.feeds.known || "—"} feeds visited
            {lastRun ? ` · last run ${new Date(lastRun.started_at).toLocaleString()} (${lastRun.trigger})` : " · no runs yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy} onClick={() => act({ action: "run-discovery" }, "Discovery finished.")} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Run discovery now
          </button>
          <SignOut />
        </div>
      </div>
      {notice && <p role="status" className="mt-5 rounded-xl border border-line bg-card px-4 py-3 text-sm">{notice}</p>}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TABS.map((item) => (
          <button key={item.status} type="button" onClick={() => setTab(item.status)} className={`rounded-2xl border p-4 text-left transition ${tab === item.status ? "border-accent bg-accent-soft" : "border-line bg-card hover:border-accent"}`}>
            <span className="block font-serif text-3xl tabular-nums">{(data.counts[item.status] ?? 0).toLocaleString("en")}</span>
            <span className="text-xs text-muted">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-full border border-line bg-card px-4">
          <Search className="size-4 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${TABS.find((item) => item.status === tab)?.label.toLowerCase()}`} className="flex-1 bg-transparent text-sm outline-none" />
        </label>
        {selected.size > 0 && ACTIONS[tab].map((action) => (
          <button key={action.status} type="button" disabled={busy} onClick={() => act({ action: "set-status", ids: [...selected], status: action.status }, `${selected.size} recordings updated.`)} className="h-10 rounded-full border border-accent px-4 text-sm font-semibold text-accent hover:bg-accent hover:text-accent-ink">
            {action.label} {selected.size}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {tracks.length === 0 && <li className="py-10 text-center text-sm text-muted">Nothing here.</li>}
        {tracks.map((track) => (
          <li key={track.id} className="grid grid-cols-[auto_auto_1fr] items-start gap-3 py-3 sm:grid-cols-[auto_auto_1fr_auto]">
            <input type="checkbox" aria-label={`Select ${track.title}`} checked={selected.has(track.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(track.id); else next.delete(track.id); return next; })} className="mt-3 size-4 accent-[var(--accent)]" />
            <button type="button" onClick={() => player.play(track, tracks)} aria-label={`Preview ${track.title}`} className="grid size-9 place-items-center rounded-full border border-line hover:border-accent hover:text-accent"><Play className="ml-0.5 size-3.5" fill="currentColor" /></button>
            <div className="min-w-0">
              <p className="font-serif text-lg leading-snug">{track.title}</p>
              <p className="text-xs text-muted">{track.composer_name}{track.performer ? ` · ${track.performer}` : ""} · {formatDuration(track.duration_seconds)} · {track.license_name}{track.play_count ? ` · ${track.play_count} plays` : ""}</p>
              <p className="mt-1 text-xs">
                <span className={`mr-2 inline-block rounded-full px-2 py-0.5 font-semibold tabular-nums ${track.quality_score >= 60 ? "bg-accent-soft text-accent" : "bg-paper-2 text-muted"}`}>{track.quality_score}</span>
                <span className="text-muted">{track.quality_notes.join(" · ") || "no concerns"}</span>
                <a href={track.source_page_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-accent hover:underline">source<ExternalLink className="size-3" /></a>
              </p>
            </div>
            <div className="col-span-3 flex gap-2 pl-14 sm:col-span-1 sm:pl-0">
              {ACTIONS[tab].map((action) => (
                <button key={action.status} type="button" disabled={busy} onClick={() => act({ action: "set-status", ids: [track.id], status: action.status }, `“${track.title}” → ${action.status}.`)} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent hover:text-accent">
                  {action.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {data.runs.length > 0 && (
        <section className="mt-14">
          <h2 className="display text-3xl">Recent discovery runs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="py-2 font-medium">Started</th><th className="font-medium">Trigger</th><th className="font-medium">Feeds</th><th className="font-medium">Examined</th><th className="font-medium">Published</th><th className="font-medium">Review</th><th className="font-medium">Rejected</th><th className="font-medium">Errors</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.runs.map((run) => (
                  <tr key={run.id} className="tabular-nums">
                    <td className="py-2">{new Date(run.started_at).toLocaleString()}</td>
                    <td>{run.trigger}</td>
                    <td title={run.feeds.join(", ")}>{run.feeds.length}</td>
                    <td>{run.examined}</td>
                    <td className="text-accent">{run.published}</td>
                    <td>{run.review}</td>
                    <td>{run.rejected}</td>
                    <td title={run.errors.map((error) => `${error.feed}: ${error.error}`).join("\n")} className={run.errors.length ? "text-accent" : "text-muted"}>{run.finished_at ? run.errors.length : "running / cut off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: form.get("email"), password: form.get("password") }) });
    setPending(false);
    if (response.ok) onSignedIn();
    else setError((await response.json().catch(() => ({}))).error ?? "Sign-in failed.");
  }
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <p className="eyebrow">Editor</p>
      <h1 className="display mt-3 text-5xl">Sign in</h1>
      <form onSubmit={submit} className="mt-8 grid gap-3">
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="h-12 rounded-xl border border-line bg-card px-4 outline-none focus:border-accent" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="h-12 rounded-xl border border-line bg-card px-4 outline-none focus:border-accent" />
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <button disabled={pending} className="mt-2 h-12 rounded-xl bg-ink font-semibold text-paper disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

function SignOut() {
  return (
    <button type="button" onClick={async () => { await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); window.location.reload(); }} aria-label="Sign out" className="grid size-11 place-items-center rounded-full border border-line text-muted hover:text-accent">
      <LogOut className="size-4" />
    </button>
  );
}

function Message({ title, body, signOut = false }: { title: string; body: string; signOut?: boolean }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="display text-4xl">{title}</h1>
      <p className="mt-4 text-sm text-muted">{body}</p>
      {signOut && <div className="mt-6 flex justify-center"><SignOut /></div>}
    </div>
  );
}
