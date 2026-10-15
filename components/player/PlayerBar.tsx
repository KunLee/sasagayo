"use client";

import Link from "next/link";
import { ListMusic, LoaderCircle, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useState } from "react";
import ShareButton from "@/components/ShareButton";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "./PlayerProvider";

export default function PlayerBar() {
  const player = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const { current } = player;
  if (!current) return null;
  const progress = player.duration ? Math.min(100, (player.time / player.duration) * 100) : 0;

  return (
    <>
      {/* Reserve space so the fixed bar never covers page content. */}
      <div aria-hidden className="h-24 sm:h-24" />
      <section
        aria-label="Now playing"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-stage/95 text-stage-ink shadow-[0_-12px_40px_rgb(0_0_0/0.25)] backdrop-blur-xl"
      >
        {showQueue && player.queue.length > 1 && (
          <div className="mx-auto max-h-[45vh] max-w-6xl overflow-y-auto border-b border-white/10 px-4 py-3 sm:px-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Up next</p>
            <ol className="grid gap-0.5">
              {player.queue.map((track, position) => (
                <li key={`${track.id}-${position}`}>
                  <button
                    type="button"
                    onClick={() => player.playAll(player.queue, position)}
                    className={`flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5 ${position === player.index ? "text-gold" : "text-stage-ink/80"}`}
                  >
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums opacity-60">{position + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{track.title}</span>
                    <span className="hidden shrink-0 text-xs opacity-60 sm:inline">{track.composer_name}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1fr)] sm:px-6">
          <div className="min-w-0">
            <Link href={`/track/${current.id}`} className="block truncate font-serif text-lg leading-tight hover:text-gold">
              {current.title}
            </Link>
            <p className="truncate text-xs text-stage-ink/60">
              <Link href={`/composers/${current.composer_slug}`} className="hover:text-stage-ink">{current.composer_name}</Link>
              {current.performer && <> · {current.performer}</>}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={player.previous} aria-label="Previous" className="hidden size-9 place-items-center rounded-full text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink sm:grid">
              <SkipBack className="size-4" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={player.toggle}
              aria-label={player.playing ? "Pause" : "Play"}
              className="grid size-11 place-items-center rounded-full bg-stage-ink text-stage transition hover:scale-105"
            >
              {player.loading && player.playing === false ? <LoaderCircle className="size-5 animate-spin" />
                : player.playing ? <Pause className="size-5" fill="currentColor" />
                : <Play className="ml-0.5 size-5" fill="currentColor" />}
            </button>
            <button type="button" onClick={player.next} disabled={player.index + 1 >= player.queue.length} aria-label="Next" className="grid size-9 place-items-center rounded-full text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink disabled:opacity-30">
              <SkipForward className="size-4" fill="currentColor" />
            </button>
          </div>

          <div className="hidden items-center justify-end gap-1 sm:flex">
            {player.queue.length > 1 && (
              <button type="button" onClick={() => setShowQueue(!showQueue)} aria-expanded={showQueue} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink">
                <ListMusic className="size-4" />{player.index + 1}/{player.queue.length}
              </button>
            )}
            <ShareButton
              iconOnly
              path={`/track/${current.id}${player.time > 10 ? `?t=${Math.floor(player.time)}` : ""}`}
              title={`${current.title} — ${current.composer_name}`}
              label="Share from this moment"
              className="grid size-9 place-items-center rounded-full text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink"
            />
            <button type="button" onClick={player.close} aria-label="Close player" className="grid size-9 place-items-center rounded-full text-stage-ink/50 hover:bg-white/10 hover:text-stage-ink">
              <X className="size-4" />
            </button>
          </div>

          <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
            <span className="w-11 text-right text-[11px] tabular-nums text-stage-ink/50">{formatDuration(player.time)}</span>
            <input
              type="range"
              className="seek"
              min={0}
              max={Math.max(1, Math.floor(player.duration))}
              value={Math.floor(player.time)}
              onChange={(event) => player.seek(Number(event.target.value))}
              style={{ "--progress": `${progress}%` } as React.CSSProperties}
              aria-label="Seek"
            />
            <span className="w-11 text-[11px] tabular-nums text-stage-ink/50">{formatDuration(player.duration)}</span>
          </div>
          {player.error && <p role="status" className="col-span-2 text-xs text-[#f0b8a8] sm:col-span-3">{player.error}</p>}
        </div>
      </section>
    </>
  );
}
