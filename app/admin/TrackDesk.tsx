"use client";

import { ExternalLink, LoaderCircle, Pause, Play, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { COMPOSERS } from "@/lib/composers";
import { formatDuration } from "@/lib/format";
import { adminPost, type AdminTrack, type Status } from "./types";

type Filters = { status: Status | "all"; since: "24h" | "7d" | "all"; composer: string; minScore: number; q: string; sort: "score" | "newest" };
type Preset = Pick<Filters, "status" | "since" | "sort">;

const DECISIONS: Record<Status, { status: Status; label: string; primary?: boolean }[]> = {
  review: [{ status: "published", label: "Publish", primary: true }, { status: "rejected", label: "Reject" }],
  published: [{ status: "hidden", label: "Hide" }, { status: "review", label: "Back to review" }],
  rejected: [{ status: "published", label: "Publish", primary: true }, { status: "review", label: "To review" }],
  hidden: [{ status: "published", label: "Restore", primary: true }],
};
/** Notes that caused an automatic rejection (score capped at 20), or all notes for low scores. */
function hardReasons(track: AdminTrack) {
  const hard = /not a recording|synthesised|MIDI|excerpt or teaching|spoken word|remix|library arrangement|stem|too short|licence not reusable|degraded/i;
  const notes = track.quality_notes.filter((note) => hard.test(note));
  return notes.length ? notes : ["low quality score"];
}

const STATUS_STYLE: Record<Status, string> = {
  published: "bg-accent text-accent-ink",
  review: "bg-gold/25 text-ink",
  rejected: "bg-paper-2 text-muted",
  hidden: "bg-paper-2 text-muted line-through",
};

export default function TrackDesk({ preset, intro, onChange }: { preset: Preset; intro?: string; onChange: () => void }) {
  const player = usePlayer();
  const [filters, setFilters] = useState<Filters>({ ...preset, composer: "", minScore: 0, q: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ tracks: AdminTrack[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams({ view: "tracks", since: filters.since, sort: filters.sort, page: String(page) });
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.composer) params.set("composer", filters.composer);
    if (filters.minScore) params.set("minScore", String(filters.minScore));
    if (filters.q.trim()) params.set("q", filters.q.trim());
    try {
      const response = await fetch(`/api/admin?${params}`, { cache: "no-store", signal });
      if (response.ok) {
        setData(await response.json());
        setSelected(new Set());
      }
    } catch {
      // Superseded by a newer filter change.
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), filters.q ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, filters.q]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function decide(ids: string[], status: Status) {
    if (status === "published") {
      // Publishing something the robot rejected needs an explicit, informed yes.
      const flagged = (data?.tracks ?? []).filter((track) => ids.includes(track.id) && track.quality_score < 40);
      if (flagged.length) {
        const reasons = new Map<string, number>();
        for (const track of flagged) for (const note of hardReasons(track)) reasons.set(note, (reasons.get(note) ?? 0) + 1);
        const summary = [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([note, count]) => `  • ${note} (${count})`).join("\n");
        const ok = window.confirm(
          `${flagged.length} of these ${ids.length} recording${ids.length === 1 ? " was" : "s were"} rejected automatically:\n\n${summary}\n\n` +
          "They are usually MIDI files, synthesised renderings, short excerpts or non-free licences — not real performances.\n\nPublish anyway?",
        );
        if (!ok) return;
      }
    }
    setBusy(true);
    setNotice("");
    try {
      await adminPost({ action: "set-status", ids, status });
      setNotice(`${ids.length} recording${ids.length === 1 ? "" : "s"} → ${status}.`);
      await load();
      onChange();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      await adminPost({ action: "edit-track", id, title: form.get("title"), performer: form.get("performer"), composerSlug: form.get("composer") });
      setEditing(null);
      setNotice("Saved.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const tracks = data?.tracks ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const selectedTracks = tracks.filter((track) => selected.has(track.id));
  const bulkStatuses = new Set(selectedTracks.map((track) => track.status));
  const bulkActions = [
    { status: "published" as const, label: "Publish" },
    { status: "review" as const, label: "To review" },
    { status: "rejected" as const, label: "Reject" },
    { status: "hidden" as const, label: "Hide" },
  ].filter((action) => [...bulkStatuses].some((status) => status !== action.status));
  const select = "h-10 rounded-full border border-line bg-card px-3 text-sm outline-none focus:border-accent";

  return (
    <div>
      {intro && <p className="mb-5 max-w-2xl text-sm text-muted">{intro}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-full border border-line bg-card px-4">
          <Search className="size-4 text-muted" />
          <input value={filters.q} onChange={(event) => update("q", event.target.value)} placeholder="Title, composer, performer…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search recordings" />
        </label>
        <select aria-label="Status" value={filters.status} onChange={(event) => update("status", event.target.value as Filters["status"])} className={select}>
          <option value="all">Any status</option><option value="review">Review</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option>
        </select>
        <select aria-label="Discovered" value={filters.since} onChange={(event) => update("since", event.target.value as Filters["since"])} className={select}>
          <option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="all">Any time</option>
        </select>
        <select aria-label="Composer" value={filters.composer} onChange={(event) => update("composer", event.target.value)} className={select}>
          <option value="">All composers</option>
          {[...COMPOSERS].sort((a, b) => a.short.localeCompare(b.short)).map((composer) => <option key={composer.slug} value={composer.slug}>{composer.short}</option>)}
        </select>
        <select aria-label="Minimum score" value={filters.minScore} onChange={(event) => update("minScore", Number(event.target.value))} className={select}>
          <option value={0}>Any score</option>{[40, 50, 60, 70, 80].map((score) => <option key={score} value={score}>Score {score}+</option>)}
        </select>
        <select aria-label="Sort" value={filters.sort} onChange={(event) => update("sort", event.target.value as Filters["sort"])} className={select}>
          <option value="score">Best first</option><option value="newest">Newest first</option>
        </select>
      </div>

      <div className="mt-4 flex min-h-10 flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={tracks.length > 0 && selected.size === tracks.length} onChange={(event) => setSelected(event.target.checked ? new Set(tracks.map((track) => track.id)) : new Set())} />
          {selected.size ? `${selected.size} selected` : `${(data?.total ?? 0).toLocaleString("en")} recordings`}
        </label>
        {selected.size > 0 && bulkActions.map((action) => (
          <button key={action.status} type="button" disabled={busy} onClick={() => decide([...selected], action.status)} className="h-9 rounded-full border border-accent px-4 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-ink disabled:opacity-50">
            {action.label}
          </button>
        ))}
        {(loading || busy) && <LoaderCircle className="size-4 animate-spin text-muted" />}
        {notice && <span role="status" className="ml-auto text-xs text-muted">{notice}</span>}
      </div>

      <ul className="mt-2 divide-y divide-line border-y border-line">
        {!loading && tracks.length === 0 && <li className="py-12 text-center text-sm text-muted">Nothing matches these filters.</li>}
        {tracks.map((track) => {
          const active = player.current?.id === track.id;
          return (
            <li key={track.id} className="grid grid-cols-[auto_auto_1fr] items-start gap-3 py-3 lg:grid-cols-[auto_auto_1fr_auto]">
              <input type="checkbox" aria-label={`Select ${track.title}`} checked={selected.has(track.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(track.id); else next.delete(track.id); return next; })} className="mt-3 size-4 accent-[var(--accent)]" />
              <button type="button" onClick={() => (active ? player.toggle() : player.play(track, tracks))} aria-label={`${active && player.playing ? "Pause" : "Preview"} ${track.title}`} className={`grid size-10 place-items-center rounded-full border transition ${active ? "border-accent bg-accent text-accent-ink" : "border-line hover:border-accent hover:text-accent"}`}>
                {active && player.playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
              </button>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-lg leading-snug">{track.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[track.status]}`}>{track.status}</span>
                  {track.reviewed_at && <span className="text-[10px] uppercase tracking-wider text-muted">editor decision</span>}
                </p>
                <p className="text-xs text-muted">
                  {track.composer_name}{track.performer ? ` · ${track.performer}` : ""} · {formatDuration(track.duration_seconds)} · {track.license_name}
                  {" · found "}{new Date(track.discovered_at).toLocaleDateString()}{track.play_count ? ` · ${track.play_count} plays` : ""}
                </p>
                <p className="mt-1 text-xs">
                  <span className={`mr-2 inline-block rounded-full px-2 py-0.5 font-semibold tabular-nums ${track.quality_score >= 70 ? "bg-accent-soft text-accent" : "bg-paper-2 text-muted"}`}>{track.quality_score}</span>
                  {track.quality_score <= 20 && (
                    <span className="mr-2 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">Rejected automatically: {hardReasons(track).join(", ")}</span>
                  )}
                  <span className="text-muted">{track.quality_notes.join(" · ") || "no concerns"}</span>
                  <a href={track.source_page_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-accent hover:underline">source<ExternalLink className="size-3" /></a>
                </p>
              </div>
              <div className="col-span-3 flex flex-wrap gap-2 pl-[5.25rem] lg:col-span-1 lg:pl-0">
                <button type="button" onClick={() => setEditing(editing === track.id ? null : track.id)} aria-expanded={editing === track.id} className="h-8 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent hover:text-accent">
                  {editing === track.id ? "Cancel" : "Edit"}
                </button>
                {DECISIONS[track.status].map((action) => (
                  <button key={action.status} type="button" disabled={busy} onClick={() => decide([track.id], action.status)} className={`h-8 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${action.primary ? "bg-ink text-paper hover:bg-accent hover:text-accent-ink" : "border border-line hover:border-accent hover:text-accent"}`}>
                    {action.label}
                  </button>
                ))}
              </div>
              {editing === track.id && (
                <form onSubmit={(event) => saveEdit(event, track.id)} className="col-span-3 grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-[2fr_1.4fr_1fr_auto] sm:items-end lg:col-span-4">
                  <label className="grid gap-1 text-xs font-semibold text-ink-2">Title
                    <input name="title" defaultValue={track.title} required maxLength={300} className="h-10 rounded-xl border border-line bg-paper px-3 text-sm font-normal outline-none focus:border-accent" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-ink-2">Performer
                    <input name="performer" defaultValue={track.performer ?? ""} maxLength={200} placeholder="Leave empty if unknown" className="h-10 rounded-xl border border-line bg-paper px-3 text-sm font-normal outline-none focus:border-accent" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-ink-2">Composer
                    <select name="composer" defaultValue={track.composer_slug} className="h-10 rounded-xl border border-line bg-paper px-2 text-sm font-normal outline-none focus:border-accent">
                      {[...COMPOSERS].sort((a, b) => a.short.localeCompare(b.short)).map((composer) => <option key={composer.slug} value={composer.slug}>{composer.name}</option>)}
                    </select>
                  </label>
                  <button type="submit" disabled={busy} className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-accent hover:text-accent-ink disabled:opacity-50">Save</button>
                  <p className="text-xs text-muted sm:col-span-4">Saving re-indexes search, re-groups movements into works, and marks this as an editor decision.</p>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="font-semibold text-accent disabled:text-muted/50">← Previous</button>
          <span className="text-muted">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="font-semibold text-accent disabled:text-muted/50">Next →</button>
        </nav>
      )}
    </div>
  );
}
