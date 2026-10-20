"use client";

import Link from "next/link";
import { Infinity as RadioIcon, ListMusic, LoaderCircle, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import ShareButton from "@/components/ShareButton";
import { formatDuration } from "@/lib/format";
import { composerNameBySlug } from "@/lib/i18n";
import { usePlayer } from "./PlayerProvider";

export default function PlayerBar() {
  const player = usePlayer();
  const { t, locale } = useI18n();
  const [showQueue, setShowQueue] = useState(false);
  const { current } = player;
  if (!current) return null;
  const progress = player.duration ? Math.min(100, (player.time / player.duration) * 100) : 0;
  const composer = composerNameBySlug(current.composer_slug, locale, current.composer_name);
  const canAdvance = player.index + 1 < player.queue.length || player.radio;

  return (
    <>
      {/* Reserve space so the fixed bar never covers page content. */}
      <div aria-hidden className="h-24" />
      <section
        aria-label={t.player.nowPlaying}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-stage/95 text-stage-ink shadow-[0_-12px_40px_rgb(0_0_0/0.25)] backdrop-blur-xl"
      >
        {showQueue && player.queue.length > 1 && (
          <div className="mx-auto max-h-[45vh] max-w-6xl overflow-y-auto border-b border-white/10 px-4 py-3 sm:px-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{t.player.upNext}</p>
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
                    {player.radioIds.has(track.id) && <span className="shrink-0 text-[10px] uppercase tracking-wider text-gold/80">{t.player.fromRadio}</span>}
                    <span className="hidden shrink-0 text-xs opacity-60 sm:inline">{composerNameBySlug(track.composer_slug, locale, track.composer_name)}</span>
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
              <Link href={`/composers/${current.composer_slug}`} className="hover:text-stage-ink">{composer}</Link>
              {current.performer && <> · {current.performer}</>}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={player.previous} aria-label={t.player.previous} className="hidden size-9 place-items-center rounded-full text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink sm:grid">
              <SkipBack className="size-4" fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={player.toggle}
              aria-label={player.playing ? t.player.pause : t.player.play}
              className="grid size-11 place-items-center rounded-full bg-stage-ink text-stage transition hover:scale-105"
            >
              {player.loading && !player.playing ? <LoaderCircle className="size-5 animate-spin" />
                : player.playing ? <Pause className="size-5" fill="currentColor" />
                : <Play className="ml-0.5 size-5" fill="currentColor" />}
            </button>
            <button type="button" onClick={player.next} disabled={!canAdvance} aria-label={t.player.next} className="grid size-9 place-items-center rounded-full text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink disabled:opacity-30">
              <SkipForward className="size-4" fill="currentColor" />
            </button>
          </div>

          <div className="hidden items-center justify-end gap-1 sm:flex">
            <button
              type="button"
              onClick={() => player.setRadio(!player.radio)}
              aria-pressed={player.radio}
              title={player.radio ? t.player.radioOn : t.player.radioOff}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs transition ${player.radio ? "bg-gold/20 text-gold" : "text-stage-ink/50 hover:bg-white/10 hover:text-stage-ink"}`}
            >
              <RadioIcon className="size-4" />{t.player.radio}
            </button>
            {player.queue.length > 1 && (
              <button type="button" onClick={() => setShowQueue(!showQueue)} aria-expanded={showQueue} aria-label={t.player.upNext} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink">
                <ListMusic className="size-4" />{player.index + 1}/{player.queue.length}
              </button>
            )}
            <ShareButton
              iconOnly
              path={`/track/${current.id}${player.time > 10 ? `?t=${Math.floor(player.time)}` : ""}`}
              title={`${current.title} — ${composer}`}
              label={t.player.shareMoment}
              className="grid size-9 place-items-center rounded-full text-stage-ink/70 hover:bg-white/10 hover:text-stage-ink"
            />
            <button type="button" onClick={player.close} aria-label={t.player.close} className="grid size-9 place-items-center rounded-full text-stage-ink/50 hover:bg-white/10 hover:text-stage-ink">
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
              aria-label={t.player.seek}
            />
            <span className="w-11 text-[11px] tabular-nums text-stage-ink/50">{formatDuration(player.duration)}</span>
          </div>
          {player.error && <p role="status" className="col-span-2 text-xs text-[#f0b8a8] sm:col-span-3">{player.error}</p>}
        </div>
      </section>
    </>
  );
}
