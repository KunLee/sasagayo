"use client";
import { useRef, useState } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
export default function StoryPlayer({
  assetId,
  title,
  artist,
}: {
  assetId?: string;
  title: string;
  artist: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (!assetId)
      return setError(
        "The storyteller shared a reference, but no playable file.",
      );
    if (!audio.current?.src) {
      setLoading(true);
      const result = await fetch(
        `/api/media?assetId=${encodeURIComponent(assetId)}`,
      );
      const payload = await result.json();
      setLoading(false);
      if (!result.ok) return setError(payload.error ?? "Audio is unavailable.");
      if (audio.current) audio.current.src = payload.streamUrl;
    }
    const player = audio.current;
    if (!player) return;
    if (player.paused) {
      await player.play();
      setPlaying(true);
    } else {
      player.pause();
      setPlaying(false);
    }
  }
  return (
    <div className="mt-5">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-2xl bg-[#d9ccbc] p-3 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2b2025] text-white">
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : playing ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="ml-0.5 size-4 fill-current" />
          )}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-xs">{title}</strong>
          <span className="mt-0.5 block truncate text-[10px] text-stone-500">
            {artist}
          </span>
        </span>
      </button>
      <audio ref={audio} onEnded={() => setPlaying(false)} preload="none" />
      {error && (
        <p className="mt-2 text-[10px] leading-4 text-stone-500">{error}</p>
      )}
    </div>
  );
}
