"use client";

import Link from "next/link";
import { Heart, Pause, Play, Shuffle } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import ShareButton from "@/components/ShareButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import { toPlayerTrack, type PlayerTrack } from "@/components/player/types";
import { formatDuration } from "@/lib/format";
import { composerNameBySlug } from "@/lib/i18n";
import { useLibrary } from "@/lib/library-store";

type Props = {
  tracks: PlayerTrack[];
  showComposer?: boolean;
  /** Number shown for the first row, for paginated lists. */
  startNumber?: number;
  emptyMessage?: string;
  /** Number rows by movement instead of position (work pages). */
  movementNumbers?: (number | null)[];
};

export default function TrackList({ tracks, showComposer = true, startNumber = 1, emptyMessage, movementNumbers }: Props) {
  const player = usePlayer();
  const library = useLibrary();
  const { t, locale } = useI18n();
  const queue = tracks.map(toPlayerTrack);
  if (!tracks.length) return <p className="py-10 text-center text-sm text-muted">{emptyMessage ?? t.list.empty}</p>;

  return (
    <ol className="divide-y divide-line border-y border-line">
      {queue.map((track, position) => {
        const active = player.current?.id === track.id;
        const saved = library.has(track.id);
        const composer = composerNameBySlug(track.composer_slug, locale, track.composer_name);
        const number = movementNumbers?.[position] ?? startNumber + position;
        return (
          <li key={track.id} className={`group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_4rem_auto] sm:gap-x-4 ${active ? "text-accent" : ""}`}>
            <button
              type="button"
              onClick={() => (active ? player.toggle() : player.play(track, queue))}
              aria-label={active && player.playing ? t.list.pause(track.title) : t.list.play(track.title)}
              className="relative grid size-9 place-items-center rounded-full text-muted transition hover:bg-accent hover:text-accent-ink"
            >
              {active && player.playing ? (
                <>
                  <span className="flex items-end gap-0.5 text-accent group-hover:hidden" aria-hidden><i className="eq-bar" /><i className="eq-bar" /><i className="eq-bar" /></span>
                  <Pause className="hidden size-4 group-hover:block" fill="currentColor" />
                </>
              ) : (
                <>
                  <span className="text-xs tabular-nums group-hover:hidden">{number}</span>
                  <Play className="ml-0.5 hidden size-4 group-hover:block" fill="currentColor" />
                </>
              )}
            </button>
            <div className="min-w-0">
              <Link href={`/track/${track.id}`} className="line-clamp-2 font-serif text-[1.15rem] leading-snug hover:underline hover:decoration-line hover:underline-offset-4 sm:line-clamp-1">
                {track.title}
              </Link>
              <p className="truncate text-xs text-muted">
                {showComposer && (
                  <Link href={`/composers/${track.composer_slug}`} className="font-medium text-ink-2 hover:text-accent">{composer}</Link>
                )}
                {showComposer && track.performer && " · "}
                {track.performer}
                {track.recorded_year && <span className="ml-1.5 rounded-full border border-line px-1.5 py-px text-[10px] tabular-nums" title={t.track.historical(track.recorded_year)}>{track.recorded_year}</span>}
                <span className="sm:hidden"> · {formatDuration(track.duration_seconds)}</span>
              </p>
            </div>
            <span className="hidden text-right text-xs tabular-nums text-muted sm:block">{formatDuration(track.duration_seconds)}</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => library.toggle(track)}
                aria-pressed={saved}
                aria-label={saved ? t.list.unsave(track.title) : t.list.save(track.title)}
                className={`grid size-9 place-items-center rounded-full transition hover:bg-accent-soft ${saved ? "text-accent" : "text-muted/70 hover:text-accent"}`}
              >
                <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
              </button>
              <ShareButton
                iconOnly
                path={`/track/${track.id}`}
                title={`${track.title} — ${composer}`}
                className="hidden size-9 place-items-center rounded-full text-muted/70 transition hover:bg-accent-soft hover:text-accent sm:grid"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PlayAllButton({ tracks, label }: { tracks: PlayerTrack[]; label?: string }) {
  const player = usePlayer();
  const { t } = useI18n();
  const total = tracks.reduce((sum, track) => sum + track.duration_seconds, 0);
  if (!tracks.length) return null;
  const queue = tracks.map(toPlayerTrack);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => player.playAll(queue)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Play className="size-4" fill="currentColor" />{label ?? t.list.playAll}
      </button>
      <button
        type="button"
        onClick={() => player.playAll([...queue].sort(() => Math.random() - 0.5))}
        aria-label={t.list.shuffle}
        title={t.list.shuffle}
        className="grid size-11 place-items-center rounded-full border border-line text-ink-2 transition hover:border-accent hover:text-accent"
      >
        <Shuffle className="size-4" />
      </button>
      <span className="ml-1 text-xs text-muted">{t.list.summary(tracks.length, t.time.total(total))}</span>
    </div>
  );
}
