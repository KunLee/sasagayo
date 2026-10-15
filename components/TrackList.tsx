"use client";

import Link from "next/link";
import { Heart, Pause, Play, Shuffle } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import { toPlayerTrack, type PlayerTrack } from "@/components/player/types";
import { formatDuration, formatTotal } from "@/lib/format";
import { useLibrary } from "@/lib/library-store";

type Props = {
  tracks: PlayerTrack[];
  showComposer?: boolean;
  /** Number shown for the first row, for paginated lists. */
  startNumber?: number;
  emptyMessage?: string;
};

export default function TrackList({ tracks, showComposer = true, startNumber = 1, emptyMessage = "Nothing here yet." }: Props) {
  const player = usePlayer();
  const library = useLibrary();
  const queue = tracks.map(toPlayerTrack);
  if (!tracks.length) return <p className="py-10 text-center text-sm text-muted">{emptyMessage}</p>;

  return (
    <ol className="divide-y divide-line border-y border-line">
      {queue.map((track, position) => {
        const active = player.current?.id === track.id;
        const saved = library.has(track.id);
        return (
          <li key={track.id} className={`group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_4rem_auto] sm:gap-x-4 ${active ? "text-accent" : ""}`}>
            <button
              type="button"
              onClick={() => (active ? player.toggle() : player.play(track, queue))}
              aria-label={active && player.playing ? `Pause ${track.title}` : `Play ${track.title}`}
              className="relative grid size-9 place-items-center rounded-full text-muted transition hover:bg-accent hover:text-accent-ink"
            >
              {active && player.playing ? (
                <>
                  <span className="flex items-end gap-0.5 text-accent group-hover:hidden" aria-hidden><i className="eq-bar" /><i className="eq-bar" /><i className="eq-bar" /></span>
                  <Pause className="hidden size-4 group-hover:block" fill="currentColor" />
                </>
              ) : (
                <>
                  <span className="text-xs tabular-nums group-hover:hidden">{startNumber + position}</span>
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
                  <Link href={`/composers/${track.composer_slug}`} className="font-medium text-ink-2 hover:text-accent">{track.composer_name}</Link>
                )}
                {showComposer && track.performer && " · "}
                {track.performer}
                <span className="sm:hidden"> · {formatDuration(track.duration_seconds)}</span>
              </p>
            </div>
            <span className="hidden text-right text-xs tabular-nums text-muted sm:block">{formatDuration(track.duration_seconds)}</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => library.toggle(track)}
                aria-pressed={saved}
                aria-label={saved ? `Remove ${track.title} from your library` : `Save ${track.title} to your library`}
                className={`grid size-9 place-items-center rounded-full transition hover:bg-accent-soft ${saved ? "text-accent" : "text-muted/70 hover:text-accent"}`}
              >
                <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
              </button>
              <ShareButton
                iconOnly
                path={`/track/${track.id}`}
                title={`${track.title} — ${track.composer_name}`}
                className="hidden size-9 place-items-center rounded-full text-muted/70 transition hover:bg-accent-soft hover:text-accent sm:grid"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PlayAllButton({ tracks, label = "Play all" }: { tracks: PlayerTrack[]; label?: string }) {
  const player = usePlayer();
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
        <Play className="size-4" fill="currentColor" />{label}
      </button>
      <button
        type="button"
        onClick={() => player.playAll([...queue].sort(() => Math.random() - 0.5))}
        aria-label="Shuffle"
        className="grid size-11 place-items-center rounded-full border border-line text-ink-2 transition hover:border-accent hover:text-accent"
      >
        <Shuffle className="size-4" />
      </button>
      <span className="ml-1 text-xs text-muted">{tracks.length} recordings · {formatTotal(total)}</span>
    </div>
  );
}
