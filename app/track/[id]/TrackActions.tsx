"use client";

import { Download, Heart, Pause, Play } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { PlayerTrack } from "@/components/player/types";
import { formatDuration } from "@/lib/format";
import { useLibrary } from "@/lib/library-store";

export default function TrackActions({ track, related, startAt, downloadUrl }: { track: PlayerTrack; related: PlayerTrack[]; startAt: number; downloadUrl: string }) {
  const player = usePlayer();
  const library = useLibrary();
  const active = player.current?.id === track.id;
  const saved = library.has(track.id);

  function play() {
    if (active) { player.toggle(); return; }
    player.playAll([track, ...related], 0, startAt);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={play}
        className="inline-flex h-14 items-center gap-3 rounded-full bg-accent pl-5 pr-7 text-base font-semibold text-accent-ink shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        {active && player.playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}
        {active && player.playing ? "Pause" : startAt > 0 && !active ? `Play from ${formatDuration(startAt)}` : "Play"}
      </button>
      <button
        type="button"
        onClick={() => library.toggle(track)}
        aria-pressed={saved}
        className={`inline-flex h-14 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${saved ? "border-accent text-accent" : "border-line hover:border-accent hover:text-accent"}`}
      >
        <Heart className="size-4" fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save"}
      </button>
      <ShareButton
        path={`/track/${track.id}`}
        title={`${track.title} — ${track.composer_name}`}
        text={`Listen free on Sasagayo: ${track.title} by ${track.composer_name}`}
        className="inline-flex h-14 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold transition hover:border-accent hover:text-accent"
      />
      <a href={downloadUrl} download className="inline-flex h-14 items-center gap-2 rounded-full px-4 text-sm text-muted transition hover:text-accent" rel="noreferrer">
        <Download className="size-4" />Download
      </a>
    </div>
  );
}
