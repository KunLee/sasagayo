"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CircleUserRound,
  LibraryBig,
  LogIn,
  Radio,
  UsersRound,
} from "lucide-react";

type Metrics = {
  members: number;
  publishedStories: number;
  circles: number;
  activeNow: number;
  loginsToday: number;
  loginsSevenDays: number;
  activePaths: { path: string; visitors: number }[];
};

const empty: Metrics = {
  members: 0,
  publishedStories: 0,
  circles: 0,
  activeNow: 0,
  loginsToday: 0,
  loginsSevenDays: 0,
  activePaths: [],
};

export default function InsightsClient() {
  const [metrics, setMetrics] = useState(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/insights", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => {
          if (alive) setMetrics({ ...empty, ...data });
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const cards = [
    [
      "Listening now",
      metrics.activeNow,
      Radio,
      "Approximate visitors active in two minutes",
    ],
    ["Members", metrics.members, UsersRound, "Community profiles"],
    [
      "Stories",
      metrics.publishedStories,
      LibraryBig,
      "Published listening stories",
    ],
    ["Circles", metrics.circles, CircleUserRound, "Public listening circles"],
    [
      "Logins today",
      metrics.loginsToday,
      LogIn,
      "Successful sign-ins since midnight",
    ],
    [
      "Seven-day logins",
      metrics.loginsSevenDays,
      Activity,
      "Successful sign-ins, not unique people",
    ],
  ] as const;

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1200px] px-6 py-14 sm:px-8 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="micro-label text-[#a74735]">Community pulse</p>
          <h1 className="mt-4 font-serif text-5xl tracking-[-.04em] sm:text-7xl">
            A room that feels{" "}
            <em className="font-normal text-[#a74735]">alive.</em>
          </h1>
          <p className="mt-5 text-sm leading-7 text-stone-600">
            A calm, real-time view of Sasagayo. It counts anonymous browser
            sessions without storing IP addresses or creating a device
            fingerprint.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-700/8 px-4 py-2 text-xs font-semibold text-emerald-800">
          <span className="size-2 animate-pulse rounded-full bg-emerald-600" />
          Refreshes every 30 seconds
        </span>
      </div>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, Icon, note]) => (
          <article
            key={label}
            className="rounded-[28px] border border-stone-900/8 bg-white/55 p-6 shadow-sm shadow-stone-900/3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-stone-500">
                {label}
              </p>
              <Icon className="size-4 text-[#a74735]" />
            </div>
            <p className="mt-7 font-serif text-5xl tabular-nums">
              {loading ? "—" : value.toLocaleString()}
            </p>
            <p className="mt-3 text-xs leading-5 text-stone-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-[32px] bg-[#2b2025] p-7 text-white sm:p-9">
        <div className="flex items-center gap-3">
          <Radio className="size-5 text-[#cf846f]" />
          <h2 className="font-serif text-3xl">Where listeners are gathering</h2>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {metrics.activePaths.length ? (
            metrics.activePaths.map((item) => (
              <div
                key={item.path}
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-5 py-4 text-sm"
              >
                <span className="truncate text-stone-300">{item.path}</span>
                <strong className="ml-4 tabular-nums">{item.visitors}</strong>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-400">
              No active paths yet. This page will wake up as listeners arrive.
            </p>
          )}
        </div>
        <p className="mt-7 text-xs leading-5 text-stone-500">
          Presence expires automatically after two quiet minutes. This is an
          estimate, not employee-style tracking or a record of an
          individual&apos;s browsing history.
        </p>
      </section>
    </main>
  );
}
