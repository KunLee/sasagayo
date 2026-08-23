"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Headphones,
  LoaderCircle,
  Plus,
  Radio,
  Users,
} from "lucide-react";
import { circles as fallback } from "@/lib/community";

type ApiCircle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  accent: string;
  circle_members?: { count: number }[];
};
export default function CirclesClient() {
  const [remote, setRemote] = useState<ApiCircle[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    fetch("/api/community?resource=circles")
      .then((r) => r.json())
      .then((data) => setRemote(data.items ?? []))
      .catch(() => undefined);
  }, []);
  const circles = fallback.map((item) => {
    const found = remote.find((circle) => circle.slug === item.slug);
    return {
      ...item,
      id: found?.id,
      members: found?.circle_members?.[0]?.count
        ? item.members + found.circle_members[0].count
        : item.members,
    };
  });
  async function toggle(id: string | undefined, slug: string) {
    if (!id) return;
    setBusy(slug);
    const leaving = joined.includes(slug);
    const result = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: leaving ? "leave-circle" : "join-circle",
        circleId: id,
      }),
    });
    setBusy("");
    if (result.status === 401)
      return setNotice("Sign in to join a listening circle.");
    if (result.ok)
      setJoined((current) =>
        leaving ? current.filter((item) => item !== slug) : [...current, slug],
      );
    else setNotice("That circle could not be updated just now.");
  }
  return (
    <div>
      <header className="bg-[#2a2025] text-[#f7f1e8]">
        <div className="mx-auto max-w-[1300px] px-6 py-16 sm:px-8 lg:py-24">
          <p className="micro-label text-[#d48169]">Listening circles</p>
          <h1 className="mt-5 max-w-4xl font-serif text-6xl leading-[.9] tracking-[-.045em] sm:text-8xl">
            Find people on
            <br />
            your <em className="font-normal text-[#d48169]">frequency.</em>
          </h1>
          <p className="mt-7 max-w-xl text-sm leading-7 text-stone-400">
            Small communities where recommendations become conversations,
            rituals, and friendships.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-[1300px] px-6 py-14 sm:px-8 lg:py-20">
        {notice && (
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-[#e7d8c5] px-5 py-4 text-xs">
            <span>{notice}</span>
            <Link href="/account" className="font-semibold text-[#a74735]">
              Open account
            </Link>
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {circles.map((circle, index) => {
            const isJoined = joined.includes(circle.slug);
            return (
              <article
                id={circle.slug}
                key={circle.slug}
                className="group flex min-h-72 flex-col rounded-[28px] border border-stone-900/8 bg-white/55 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl font-serif text-white"
                    style={{ backgroundColor: circle.accent }}
                  >
                    {circle.name
                      .split(" ")
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  {index < 3 && (
                    <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-emerald-700">
                      <Radio className="size-3" />
                      Active now
                    </span>
                  )}
                </div>
                <h2 className="mt-7 font-serif text-2xl">{circle.name}</h2>
                <p className="mt-3 text-xs leading-6 text-stone-500">
                  {circle.description}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-6">
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-stone-400">
                    <Users className="size-3.5" />
                    {circle.members.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    · {circle.cadence}
                  </span>
                  <button
                    onClick={() => toggle(circle.id, circle.slug)}
                    disabled={busy === circle.slug}
                    className={`ml-auto inline-flex h-9 items-center gap-2 rounded-full px-4 text-[10px] font-semibold ${isJoined ? "bg-[#dce7df] text-emerald-800" : "bg-[#2b2025] text-white"}`}
                  >
                    {busy === circle.slug ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : isJoined ? (
                      <Check className="size-3" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    {isJoined ? "Joined" : "Join"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <section className="mt-14 grid gap-8 rounded-[30px] bg-[#a74735] p-8 text-[#fff8ee] sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Headphones className="size-6" />
            <h2 className="mt-4 font-serif text-4xl">
              A circle can begin with one song.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[#f1c3b5]">
              Circle creation and moderation tools are coming next. Tell us what
              kind of room you want to host.
            </p>
          </div>
          <Link
            href="/contact"
            className="rounded-full bg-[#fff8ee] px-6 py-3 text-center text-xs font-semibold text-[#2b2025]"
          >
            Propose a circle
          </Link>
        </section>
      </div>
    </div>
  );
}
