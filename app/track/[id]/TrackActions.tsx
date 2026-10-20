"use client";

import { Download, Heart, Infinity as RadioIcon, Pause, Play } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import ShareButton from "@/components/ShareButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { PlayerTrack } from "@/components/player/types";
import { formatDuration } from "@/lib/format";
import { composerNameBySlug } from "@/lib/i18n";
import { useLibrary } from "@/lib/library-store";

export default function TrackActions({ track, related, startAt, downloadUrl }: { track: PlayerTrack; related: PlayerTrack[]; startAt: number; downloadUrl: string }) {
  const player = usePlayer();
  const library = useLibrary();
  const { t, locale } = useI18n();
  const active = player.current?.id === track.id;
  const saved = library.has(track.id);
  const composer = composerNameBySlug(track.composer_slug, locale, track.composer_name);

  function play() {
    if (active) { player.toggle(); return; }
    player.playAll([track, ...related], 0, startAt);
  }

  const secondary = "inline-flex h-14 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={play}
        className="inline-flex h-14 items-center gap-3 rounded-full bg-accent pl-5 pr-7 text-base font-semibold text-accent-ink shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        {active && player.playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}
        {active && player.playing ? t.track.pause : startAt > 0 && !active ? t.track.playFrom(formatDuration(startAt)) : t.track.play}
      </button>
      <button
        type="button"
        onClick={() => library.toggle(track)}
        aria-pressed={saved}
        className={`${secondary} ${saved ? "border-accent text-accent" : "border-line hover:border-accent hover:text-accent"}`}
      >
        <Heart className="size-4" fill={saved ? "currentColor" : "none"} />{saved ? t.track.saved : t.track.save}
      </button>
      <button type="button" onClick={() => player.startRadio(track)} className={`${secondary} border-line hover:border-accent hover:text-accent`}>
        <RadioIcon className="size-4" />{t.track.startRadio}
      </button>
      <ShareButton
        path={`/track/${track.id}`}
        title={`${track.title} — ${composer}`}
        text={t.track.shareText(track.title, composer)}
        className={`${secondary} border-line hover:border-accent hover:text-accent`}
      />
      <a href={downloadUrl} download className="inline-flex h-14 items-center gap-2 rounded-full px-4 text-sm text-muted transition hover:text-accent" rel="noreferrer">
        <Download className="size-4" />{t.track.download}
      </a>
    </div>
  );
}
