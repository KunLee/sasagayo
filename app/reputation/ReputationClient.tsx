"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Award, LoaderCircle, Sparkles } from "lucide-react";

const tiers = [
  {
    points: 0,
    title: "New Listener",
    privilege: "Share, save, react, and join the conversation",
  },
  {
    points: 100,
    title: "Curious Ear",
    privilege: "A visible mark of thoughtful participation",
  },
  {
    points: 300,
    title: "Storyteller",
    privilege: "Eligible for community story spotlights",
  },
  {
    points: 750,
    title: "Tastemaker",
    privilege: "Create public circles after seven days",
  },
  {
    points: 1500,
    title: "Community Guide",
    privilege: "Eligible for trusted curation tools",
  },
  {
    points: 3000,
    title: "Listener Laureate",
    privilege: "Highest community recognition",
  },
];
type Event = {
  id: number;
  event_type: string;
  points: number;
  reason: string;
  created_at: string;
};
type Data = {
  profile: {
    display_name?: string;
    handle?: string;
    reputation_points: number;
    reputation_title: string;
  };
  events: Event[];
};

export default function ReputationClient() {
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "signed-out" | "error"
  >("loading");
  useEffect(() => {
    fetch("/api/insights?scope=me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return setStatus("signed-out");
        if (!response.ok) return setStatus("error");
        setData(await response.json());
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading")
    return (
      <main className="grid min-h-[65vh] place-items-center">
        <LoaderCircle className="size-7 animate-spin text-[#a74735]" />
      </main>
    );
  if (status === "signed-out")
    return (
      <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-24 text-center">
        <Award className="mx-auto size-9 text-[#a74735]" />
        <h1 className="mt-6 font-serif text-5xl">Your listening reputation</h1>
        <p className="mt-5 text-stone-600">
          Sign in to see the points and recognition earned by your
          contributions.
        </p>
        <Link
          href="/account"
          className="mt-8 inline-flex h-12 items-center gap-3 rounded-full bg-[#2b2025] px-6 text-xs font-semibold text-white"
        >
          Sign in <ArrowRight className="size-4" />
        </Link>
      </main>
    );
  if (!data || status === "error")
    return (
      <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-24">
        <h1 className="font-serif text-5xl">Reputation is resting.</h1>
        <p className="mt-4 text-stone-600">Please try again shortly.</p>
      </main>
    );

  const points = data.profile.reputation_points;
  const currentIndex = Math.max(
    0,
    tiers.findLastIndex((tier) => points >= tier.points),
  );
  const current = tiers[currentIndex];
  const next = tiers[currentIndex + 1];
  const progress = next
    ? Math.min(
        100,
        ((points - current.points) / (next.points - current.points)) * 100,
      )
    : 100;
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-14 sm:px-8 sm:py-20">
      <section className="overflow-hidden rounded-[38px] bg-[#2b2025] p-7 text-white sm:p-11">
        <p className="micro-label text-[#cf846f]">Your contribution</p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end">
          <div>
            <h1 className="font-serif text-5xl tracking-[-.04em] sm:text-7xl">
              {data.profile.reputation_title}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-stone-400">
              Reputation rewards useful contributions and genuine appreciation
              from other listeners—not empty volume.
            </p>
          </div>
          <div>
            <p className="font-serif text-6xl tabular-nums text-[#f0b29f]">
              {points.toLocaleString()}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[.14em] text-stone-500">
              reputation points
            </p>
            {next && (
              <>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#cf846f]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-stone-400">
                  {next.points - points} points to {next.title}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-[#a74735]" />
            <h2 className="font-serif text-3xl">Recognition path</h2>
          </div>
          <div className="mt-6 grid gap-3">
            {tiers.map((tier) => (
              <div
                key={tier.title}
                className={`rounded-2xl border p-5 ${points >= tier.points ? "border-[#a74735]/20 bg-[#a74735]/5" : "border-stone-900/8 bg-white/40"}`}
              >
                <div className="flex justify-between gap-4">
                  <strong className="font-serif text-xl">{tier.title}</strong>
                  <span className="text-xs font-semibold text-[#a74735]">
                    {tier.points.toLocaleString()} pts
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  {tier.privilege}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-serif text-3xl">Recent points</h2>
          <div className="mt-6 grid gap-3">
            {data.events.length ? (
              data.events.map((event) => (
                <article
                  key={event.id}
                  className="flex gap-4 rounded-2xl border border-stone-900/8 bg-white/50 p-5"
                >
                  <span className="font-serif text-2xl text-[#a74735]">
                    +{event.points}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{event.reason}</p>
                    <time className="mt-1 block text-xs text-stone-400">
                      {new Date(event.created_at).toLocaleDateString()}
                    </time>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-900/15 p-6 text-sm leading-6 text-stone-500">
                Your ledger is empty. Publishing a story is a lovely first step.
              </p>
            )}
          </div>
          <p className="mt-6 text-xs leading-5 text-stone-500">
            Daily caps and unique-listener rules reduce spam. Sensitive
            moderation powers are never granted by points alone.
          </p>
        </div>
      </section>
    </main>
  );
}
