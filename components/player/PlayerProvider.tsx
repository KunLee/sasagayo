"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PlayerTrack } from "./types";
import PlayerBar from "./PlayerBar";

type PlayerState = {
  queue: PlayerTrack[];
  index: number;
  current: PlayerTrack | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
  time: number;
  duration: number;
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  playAll: (tracks: PlayerTrack[], startAt?: number, offsetSeconds?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  enqueue: (track: PlayerTrack) => void;
  close: () => void;
  /** When the queue runs out, keep going with similar recordings. */
  radio: boolean;
  setRadio: (enabled: boolean) => void;
  startRadio: (track: PlayerTrack) => void;
  /** Ids of queue entries that radio added. */
  radioIds: Set<string>;
};

const RADIO_KEY = "sasagayo:radio";

async function fetchRadio(seedId: string, exclude: string[]) {
  const params = new URLSearchParams({ seed: seedId, exclude: exclude.slice(-300).join(",") });
  const response = await fetch(`/api/radio?${params}`);
  if (!response.ok) return [];
  return ((await response.json()) as { tracks: PlayerTrack[] }).tracks;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}

export default function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const counted = useRef<string | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const retried = useRef<string | null>(null);
  const [radio, setRadioState] = useState(true);
  const [radioIds, setRadioIds] = useState<Set<string>>(new Set());
  const extending = useRef<Promise<PlayerTrack[]> | null>(null);
  const current = index >= 0 ? queue[index] ?? null : null;

  // Remember the radio preference per browser.
  useEffect(() => {
    try {
      // Reading storage is only possible after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(RADIO_KEY) === "off") setRadioState(false);
    } catch {
      // Storage unavailable: keep the default.
    }
  }, []);
  const setRadio = useCallback((enabled: boolean) => {
    setRadioState(enabled);
    try { window.localStorage.setItem(RADIO_KEY, enabled ? "on" : "off"); } catch { /* ignore */ }
  }, []);

  /** Appends radio picks after the current queue (deduplicated, at most one request at a time). */
  const extend = useCallback((list: PlayerTrack[], seed: PlayerTrack) => {
    if (!extending.current) {
      extending.current = fetchRadio(seed.id, list.map((track) => track.id))
        .catch(() => [] as PlayerTrack[])
        .finally(() => { extending.current = null; });
    }
    return extending.current.then((picks) => {
      const known = new Set(list.map((track) => track.id));
      const fresh = picks.filter((track) => !known.has(track.id));
      if (fresh.length) setRadioIds((ids) => new Set([...ids, ...fresh.map((track) => track.id)]));
      return [...list, ...fresh];
    });
  }, []);

  const start = useCallback((tracks: PlayerTrack[], at: number, offset = 0) => {
    const element = audio.current;
    const track = tracks[at];
    if (!element || !track) return;
    setQueue(tracks);
    setIndex(at);
    setError(null);
    setTime(offset);
    setDuration(track.duration_seconds);
    setLoading(true);
    pendingSeek.current = offset > 0 ? offset : null;
    counted.current = null;
    element.src = track.stream_url;
    element.play().catch(() => {
      // Autoplay can be refused (e.g. a shared link opened without a click); the bar shows Play.
      setLoading(false);
      setPlaying(false);
    });
  }, []);

  const play = useCallback((track: PlayerTrack, list?: PlayerTrack[]) => {
    const tracks = list?.length ? list : [track];
    start(tracks, Math.max(0, tracks.findIndex((item) => item.id === track.id)));
  }, [start]);

  const playAll = useCallback((tracks: PlayerTrack[], startAt = 0, offsetSeconds = 0) => start(tracks, startAt, offsetSeconds), [start]);

  const toggle = useCallback(() => {
    const element = audio.current;
    if (!element || !current) return;
    if (element.paused) void element.play().catch(() => setError("Playback was blocked by the browser."));
    else element.pause();
  }, [current]);

  const next = useCallback(() => {
    if (index + 1 < queue.length) { start(queue, index + 1); return; }
    if (radio && current) {
      void extend(queue, current).then((longer) => {
        if (longer.length > index + 1) start(longer, index + 1);
        else setPlaying(false);
      });
      return;
    }
    audio.current?.pause();
    setPlaying(false);
  }, [index, queue, start, radio, current, extend]);

  const startRadio = useCallback((track: PlayerTrack) => {
    setRadio(true);
    setRadioIds(new Set());
    start([track], 0);
    void extend([track], track).then((longer) => setQueue((items) => (items[0]?.id === track.id && items.length === 1 ? longer : items)));
  }, [setRadio, start, extend]);

  // Fetch the next radio picks while the last queued track plays, so the hand-over is instant.
  useEffect(() => {
    if (!radio || !current || index !== queue.length - 1) return;
    void extend(queue, current).then((longer) => {
      if (longer.length > queue.length) setQueue((items) => (items.length === queue.length ? longer : items));
    });
  }, [radio, current, index, queue, extend]);

  const previous = useCallback(() => {
    const element = audio.current;
    if (element && element.currentTime > 5) element.currentTime = 0;
    else if (index > 0) start(queue, index - 1);
  }, [index, queue, start]);

  const seek = useCallback((seconds: number) => {
    if (audio.current) audio.current.currentTime = seconds;
    setTime(seconds);
  }, []);

  const enqueue = useCallback((track: PlayerTrack) => {
    if (!current) { start([track], 0); return; }
    setQueue((items) => items.some((item) => item.id === track.id) ? items : [...items, track]);
  }, [current, start]);

  const close = useCallback(() => {
    audio.current?.pause();
    if (audio.current) audio.current.removeAttribute("src");
    setQueue([]);
    setIndex(-1);
    setPlaying(false);
  }, []);

  // Lock-screen / headphone controls.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: [current.composer_name, current.performer].filter(Boolean).join(" · "),
      album: "Sasagayo",
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", index + 1 < queue.length || radio ? next : null);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("seekto", (details) => details.seekTime != null && seek(details.seekTime));
  }, [current, index, queue.length, next, previous, seek, toggle, radio]);

  const value = useMemo<PlayerState>(() => ({
    queue, index, current, playing, loading, error, time, duration,
    play, playAll, toggle, next, previous, seek, enqueue, close,
    radio, setRadio, startRadio, radioIds,
  }), [queue, index, current, playing, loading, error, time, duration, play, playAll, toggle, next, previous, seek, enqueue, close, radio, setRadio, startRadio, radioIds]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="none"
        onPlaying={() => { setPlaying(true); setLoading(false); }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onLoadedMetadata={(event) => {
          const element = event.currentTarget;
          if (Number.isFinite(element.duration)) setDuration(element.duration);
          if (pendingSeek.current != null) { element.currentTime = pendingSeek.current; pendingSeek.current = null; }
        }}
        onTimeUpdate={(event) => {
          const seconds = event.currentTarget.currentTime;
          setTime(seconds);
          if (current && seconds > 30 && counted.current !== current.id) {
            counted.current = current.id;
            void fetch("/api/tracks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: current.id }) }).catch(() => undefined);
          }
        }}
        onEnded={next}
        onError={(event) => {
          if (!current) return;
          // Archives occasionally throttle bursts (HTTP 429); one delayed retry usually succeeds.
          if (retried.current !== current.id) {
            retried.current = current.id;
            const element = event.currentTarget;
            const resumeAt = element.currentTime;
            window.setTimeout(() => {
              pendingSeek.current = resumeAt > 0 ? resumeAt : null;
              element.src = current.stream_url;
              void element.play().catch(() => undefined);
            }, 1500);
            return;
          }
          setLoading(false);
          setError(`“${current.title}” — ${document.documentElement.lang.startsWith("zh") ? "无法从档案馆加载。" : "could not be loaded from its archive."}`);
          if (index + 1 < queue.length || radio) window.setTimeout(next, 1500);
        }}
      />
      <PlayerBar />
    </PlayerContext.Provider>
  );
}
