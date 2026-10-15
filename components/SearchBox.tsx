"use client";

import { LoaderCircle, Play, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { PlayerTrack } from "@/components/player/types";

type Props = { size?: "header" | "hero"; defaultValue?: string; autoFocus?: boolean };

export default function SearchBox({ size = "header", defaultValue = "", autoFocus = false }: Props) {
  const router = useRouter();
  const player = usePlayer();
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<PlayerTrack[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tracks?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { tracks: PlayerTrack[]; total: number };
        setResults(data.tracks);
        setTotal(data.total);
      } catch {
        // A newer keystroke aborted this request.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const hero = size === "hero";
  const showResults = open && query.trim().length >= 2;
  return (
    <form ref={box} role="search" onSubmit={submit} className="relative w-full">
      <label className={`flex items-center gap-3 rounded-full border border-line bg-card transition focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)] ${hero ? "h-16 px-6 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.35)]" : "h-10 px-4"}`}>
        <Search className={`${hero ? "size-5" : "size-4"} shrink-0 text-muted`} aria-hidden />
        <span className="sr-only">Search the library</span>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
          autoFocus={autoFocus}
          enterKeyHint="search"
          placeholder={hero ? "Try “Chopin nocturne”, “Bach cello”, or 肖邦…" : "Search composers, works, performers"}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showResults}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/70 ${hero ? "text-lg" : "text-sm"}`}
        />
        {loading && <LoaderCircle className="size-4 shrink-0 animate-spin text-muted" aria-hidden />}
        {hero && (
          <button type="submit" className="hidden h-10 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-accent sm:block">
            Search
          </button>
        )}
      </label>
      {showResults && (
        <div id={listId} className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-card text-left shadow-2xl">
          {results.length ? (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((track) => (
                <li key={track.id} className="flex items-center gap-2 px-2">
                  <button
                    type="button"
                    onClick={() => player.play(track, results)}
                    aria-label={`Play ${track.title}`}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-accent hover:text-accent-ink"
                  >
                    <Play className="ml-0.5 size-3.5" fill="currentColor" />
                  </button>
                  <Link href={`/track/${track.id}`} onClick={() => setOpen(false)} className="min-w-0 flex-1 rounded-lg px-1 py-2 hover:bg-paper-2">
                    <span className="block truncate font-serif text-base leading-tight">{track.title}</span>
                    <span className="block truncate text-xs text-muted">{track.composer_name}{track.performer ? ` · ${track.performer}` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <p className="px-5 py-4 text-sm text-muted">No recordings match “{query.trim()}” yet.</p>
          )}
          {total > results.length && (
            <button type="submit" className="block w-full border-t border-line px-5 py-3 text-left text-sm font-semibold text-accent hover:bg-paper-2">
              See all {total} results →
            </button>
          )}
        </div>
      )}
    </form>
  );
}
