"use client";

import {
  Download,
  ExternalLink,
  HardDrive,
  Library,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Track = {
  id: string;
  title: string;
  artist_name: string;
  description: string;
  license_name: string;
  license_url: string;
  attribution: string;
  source_page_url: string;
  size_bytes: number;
  imported_at: string;
};
type Reference = {
  id: string;
  title: string;
  artist_name: string;
  external_url: string;
  source: string;
  license_name: string;
  license_url: string;
};
export default function CatalogClient() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const loadCatalog = useCallback(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Catalog request failed.");
        return response.json();
      })
      .then((data) => {
        setTracks(data.tracks ?? []);
        setReferences(data.references ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => loadCatalog(), [loadCatalog]);
  function retryCatalog() {
    setLoading(true);
    setError(false);
    loadCatalog();
  }
  const visibleTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) =>
      [track.title, track.artist_name, track.license_name].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      ),
    );
  }, [query, tracks]);
  const storedBytes = tracks.reduce(
    (total, track) => total + (track.size_bytes || 0),
    0,
  );
  const storedSize =
    storedBytes >= 1024 * 1024 * 1024
      ? `${(storedBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
      : `${(storedBytes / 1024 / 1024).toFixed(storedBytes ? 1 : 0)} MB`;
  async function toggle(id: string) {
    if (playing === id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    setPending(id);
    const response = await fetch(`/api/catalog?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = await response.json();
    setPending(null);
    if (!response.ok || !data.streamUrl) return;
    if (audio.current) {
      audio.current.src = data.streamUrl;
      await audio.current.play();
      setPlaying(id);
    }
  }
  async function download(id: string) {
    setDownloading(id);
    const response = await fetch(
      `/api/catalog?id=${encodeURIComponent(id)}&mode=download`,
      { cache: "no-store" },
    );
    const data = await response.json();
    setDownloading(null);
    if (response.ok && data.downloadUrl)
      window.location.assign(data.downloadUrl);
  }
  return (
    <main className="mx-auto min-h-[70vh] max-w-[1200px] px-6 py-14 sm:px-8 sm:py-20">
      <audio ref={audio} onEnded={() => setPlaying(null)} />
      <header className="max-w-3xl">
        <p className="micro-label text-[var(--theme-accent)]">
          Open classical library
        </p>
        <h1 className="mt-5 font-serif text-6xl leading-[.92] tracking-[-.04em] sm:text-8xl">
          Music we can{" "}
          <em className="font-normal text-[var(--theme-accent)]">
            share freely.
          </em>
        </h1>
        <p className="mt-6 text-sm leading-7 text-stone-600">
          A growing daily collection of public-domain and Creative Commons
          classical recordings. Every performance keeps its source, performer,
          license, and attribution attached.
        </p>
      </header>
      {!loading && !error && (
        <section className="mt-10 grid overflow-hidden rounded-[28px] border border-stone-900/8 bg-white/45 sm:grid-cols-[1fr_auto_auto]">
          <label className="flex min-h-16 items-center gap-3 px-5">
            <Search className="size-4 shrink-0 text-[var(--theme-accent)]" />
            <span className="sr-only">Search the open catalogue</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recording, performer, or licence"
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </label>
          <div className="flex min-w-40 items-center gap-3 border-t border-stone-900/8 px-5 sm:border-l sm:border-t-0">
            <Library className="size-4 text-[var(--theme-accent)]" />
            <div>
              <strong className="block font-serif text-xl font-normal">
                {tracks.length}
              </strong>
              <span className="text-[9px] uppercase tracking-wider text-stone-400">
                open recordings
              </span>
            </div>
          </div>
          <div className="flex min-w-36 items-center gap-3 border-t border-stone-900/8 px-5 sm:border-l sm:border-t-0">
            <HardDrive className="size-4 text-[var(--theme-accent)]" />
            <div>
              <strong className="block font-serif text-xl font-normal">
                {storedSize}
              </strong>
              <span className="text-[9px] uppercase tracking-wider text-stone-400">
                preserved
              </span>
            </div>
          </div>
        </section>
      )}
      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="size-6 animate-spin text-[var(--theme-accent)]" />
        </div>
      ) : error ? (
        <section className="mt-14 rounded-[30px] border border-dashed border-stone-900/15 p-12 text-center">
          <RefreshCw className="mx-auto size-7 text-[var(--theme-accent)]" />
          <h2 className="mt-5 font-serif text-3xl">The archive is resting.</h2>
          <p className="mt-3 text-sm text-stone-500">
            We could not reach the catalogue just now. Nothing has been lost.
          </p>
          <button
            type="button"
            onClick={retryCatalog}
            className="mt-6 rounded-full bg-[var(--theme-invert)] px-5 py-3 text-xs font-semibold text-[var(--theme-invert-text)]"
          >
            Try again
          </button>
        </section>
      ) : tracks.length ? (
        <>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-500" aria-live="polite">
            Showing {visibleTracks.length} of {tracks.length} recording{tracks.length === 1 ? "" : "s"}
          </p>
          <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone-400">
            <ShieldCheck className="size-3.5 text-[var(--theme-accent)]" />
            Licence checked before import
          </p>
        </div>
        {visibleTracks.length ? (
        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {visibleTracks.map((track) => (
            <article
              key={track.id}
              className="rounded-[28px] border border-stone-900/8 bg-white/55 p-6"
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggle(track.id)}
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--theme-invert)] text-[var(--theme-invert-text)]"
                  aria-label={`${playing === track.id ? "Pause" : "Play"} ${track.title}`}
                >
                  {pending === track.id ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : playing === track.id ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="ml-0.5 size-4" />
                  )}
                </button>
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl leading-tight">
                    {track.title}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {track.artist_name}
                  </p>
                </div>
              </div>
              {track.description && (
                <p className="mt-5 line-clamp-3 text-xs leading-5 text-stone-500">
                  {track.description}
                </p>
              )}
              <details className="mt-4 text-xs text-stone-500">
                <summary className="font-semibold text-stone-600">
                  Required attribution
                </summary>
                <p className="mt-2 leading-5">{track.attribution}</p>
              </details>
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-stone-900/8 pt-4 text-[10px]">
                <a
                  href={track.license_url || track.source_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-stone-900/5 px-3 py-1.5 font-semibold"
                >
                  {track.license_name}
                </a>
                <button
                  onClick={() => download(track.id)}
                  disabled={downloading === track.id}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-900/10 px-3 py-1.5 font-semibold disabled:opacity-50"
                >
                  {downloading === track.id ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3" />
                  )}
                  Download copy
                </button>
                <a
                  href={track.source_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-stone-500"
                >
                  Source & attribution <ExternalLink className="size-3" />
                </a>
              </div>
            </article>
          ))}
        </section>
        ) : (
          <section className="mt-5 rounded-[30px] border border-dashed border-stone-900/15 p-10 text-center">
            <Search className="mx-auto size-6 text-[var(--theme-accent)]" />
            <h2 className="mt-4 font-serif text-2xl">No matching recording.</h2>
            <button type="button" onClick={() => setQuery("")} className="mt-3 text-xs font-semibold text-[var(--theme-accent)]">Clear search</button>
          </section>
        )}
        </>
      ) : (
        <section className="mt-14 rounded-[30px] border border-dashed border-stone-900/15 p-12 text-center">
          <Library className="mx-auto size-7 text-[var(--theme-accent)]" />
          <h2 className="mt-5 font-serif text-3xl">The shelves are ready.</h2>
          <p className="mt-3 text-sm text-stone-500">
            The first licensed recording will arrive after the daily importer
            runs.
          </p>
        </section>
      )}
      {!loading && references.length > 0 && (
        <section className="mt-16">
          <p className="micro-label text-[var(--theme-accent)]">
            Listen at the source
          </p>
          <h2 className="mt-3 font-serif text-4xl">Recommended, not copied.</h2>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-stone-500">
            These recordings are worth sharing, but Sasagayo has not established
            permission to store a copy. Playback and any download remain
            governed by the source platform.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {references.map((item) => (
              <a
                key={item.id}
                href={item.external_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-stone-900/8 bg-white/55 p-5 transition hover:-translate-y-0.5"
              >
                <p className="font-serif text-xl">{item.title}</p>
                <p className="mt-2 text-xs text-stone-500">
                  {item.artist_name}
                </p>
                <div className="mt-5 flex items-center justify-between text-[10px] text-stone-400">
                  <span>{item.source.replaceAll("_", " ")}</span>
                  <ExternalLink className="size-3" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
