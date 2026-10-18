"use client";

import { useSyncExternalStore } from "react";
import type { PlayerTrack } from "@/components/player/types";

/**
 * The listener's library. Signed out, it lives in this browser's storage;
 * signed in, the account is the source of truth and every change is saved
 * to the server (browser saves are merged in on sign-in).
 */
const KEY = "sasagayo:library:v1";
const EMPTY: PlayerTrack[] = [];
let cache: PlayerTrack[] | null = null;
let remote: { accountId: string } | null = null;
let syncState: "idle" | "saving" | "error" = "idle";
let pushTimer: number | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function readLocal(): PlayerTrack[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(tracks: PlayerTrack[]) {
  try {
    if (tracks.length) window.localStorage.setItem(KEY, JSON.stringify(tracks));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private mode or full storage: the library still works for this visit.
  }
}

function read(): PlayerTrack[] {
  if (cache) return cache;
  cache = remote ? [] : readLocal();
  return cache;
}

async function push() {
  if (!remote) return;
  syncState = "saving";
  notify();
  try {
    const response = await fetch("/api/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: read().map((track) => track.id) }),
    });
    syncState = response.ok ? "idle" : "error";
  } catch {
    syncState = "error";
  }
  notify();
}

function write(next: PlayerTrack[]) {
  cache = next;
  if (remote) {
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => void push(), 400);
  } else {
    writeLocal(next);
  }
  notify();
}

/** Called by the session provider when someone signs in. */
export async function connectAccount(accountId: string) {
  if (remote?.accountId === accountId) return;
  const local = readLocal();
  remote = { accountId };
  syncState = "saving";
  notify();
  try {
    const response = await fetch("/api/library", { cache: "no-store" });
    if (!response.ok) throw new Error("load failed");
    const { tracks } = (await response.json()) as { tracks: PlayerTrack[] };
    const known = new Set(tracks.map((track) => track.id));
    const additions = local.filter((track) => !known.has(track.id));
    cache = [...additions.map(toStored), ...tracks];
    syncState = "idle";
    writeLocal([]);
    if (additions.length) await push();
  } catch {
    // Keep showing the browser library rather than an empty one.
    cache = local;
    syncState = "error";
  }
  notify();
}

/** Called on sign-out: the account's library must not stay on a shared device. */
export function disconnectAccount() {
  window.clearTimeout(pushTimer);
  remote = null;
  cache = [];
  syncState = "idle";
  writeLocal([]);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY && !remote) {
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

const getSync = () => syncState;
const getRemote = () => Boolean(remote);

export function useLibrary() {
  const tracks = useSyncExternalStore(subscribe, read, () => EMPTY);
  const sync = useSyncExternalStore(subscribe, getSync, () => "idle" as const);
  const synced = useSyncExternalStore(subscribe, getRemote, () => false);
  return {
    tracks,
    sync,
    synced,
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
