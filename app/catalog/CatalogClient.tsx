"use client";

import {
  Download,
  ExternalLink,
  Library,
  LoaderCircle,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Track = {
  id: string;
  title: string;
  artist_name: string;
  description: string;
  license_name: string;
  license_url: string;
  attribution: string;
  source_page_url: string;
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
  const [playing, setPlaying] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setTracks(data.tracks ?? []);
        setReferences(data.references ?? []);
      })
      .finally(() => setLoading(false));
  }, []);
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
          Open music library
        </p>
        <h1 className="mt-5 font-serif text-6xl leading-[.92] tracking-[-.04em] sm:text-8xl">
          Music we can{" "}
          <em className="font-normal text-[var(--theme-accent)]">
            share freely.
          </em>
        </h1>
        <p className="mt-6 text-sm leading-7 text-stone-600">
          A growing daily collection of public-domain and Creative Commons
          recordings. Every track keeps its source, creator, license, and
          attribution attached.
        </p>
      </header>
      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="size-6 animate-spin text-[var(--theme-accent)]" />
        </div>
      ) : tracks.length ? (
        <section className="mt-12 grid gap-4 md:grid-cols-2">
          {tracks.map((track) => (
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
