"use client";

import { useSyncExternalStore } from "react";
import type { PlayerTrack } from "@/components/player/types";

/** Personal library kept in the browser: no account needed to save or share. */
const KEY = "sasagayo:library:v1";
const EMPTY: PlayerTrack[] = [];
let cache: PlayerTrack[] | null = null;
const listeners = new Set<() => void>();

function read(): PlayerTrack[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: PlayerTrack[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the library still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLibrary() {
  const tracks = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    tracks,
    has: (id: string) => tracks.some((track) => track.id === id),
    toggle: (track: PlayerTrack) => {
      const current = read();
      write(current.some((item) => item.id === track.id)
        ? current.filter((item) => item.id !== track.id)
        : [toStored(track), ...current]);
    },
    addMany: (items: PlayerTrack[]) => {
      const current = read();
      const ids = new Set(current.map((item) => item.id));
      write([...items.filter((item) => !ids.has(item.id)).map(toStored), ...current]);
    },
    remove: (id: string) => write(read().filter((item) => item.id !== id)),
    move: (id: string, delta: number) => {
      const current = [...read()];
      const index = current.findIndex((item) => item.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return;
      [current[index], current[target]] = [current[target], current[index]];
      write(current);
    },
    clear: () => write([]),
  };
}

function toStored(track: PlayerTrack): PlayerTrack {
  const { id, title, composer_slug, composer_name, performer, duration_seconds, stream_url } = track;
  return { id, title, composer_slug, composer_name, performer, duration_seconds, stream_url };
}
