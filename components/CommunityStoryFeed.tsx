"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Music2 } from "lucide-react";
type Item = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  mood: string;
  track_title: string;
  artist_name: string;
  profiles?: { handle: string; display_name: string; location: string };
};
export default function CommunityStoryFeed() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    // The default listing is cacheable server-side (see /api/community),
    // so opting into the browser's HTTP cache here means repeat visits to
    // the Stories view within the revalidation window resolve instantly
    // instead of blocking on a fresh network round trip every time.
    fetch("/api/community?resource=stories", {
      signal: controller.signal,
      cache: "force-cache",
    })
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!items.length) return null;
  return (
    <section className="mt-14 border-t border-stone-900/8 pt-12">
      <div className="mb-6">
        <p className="micro-label text-[#a74735]">Fresh from the community</p>
        <h2 className="mt-3 font-serif text-4xl">Just published.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Link
            href={`/stories/${item.slug}`}
            key={item.id}
            className="group rounded-[24px] border border-stone-900/8 bg-white/55 p-6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
          >
            <div className="flex justify-between gap-4">
              <span className="micro-label text-[#a74735]">
                {item.category}
              </span>
              <ArrowUpRight className="size-4 text-stone-400 group-hover:text-[#a74735]" />
            </div>
            <h3 className="mt-4 font-serif text-2xl leading-tight">
              {item.title}
            </h3>
            <p className="mt-3 line-clamp-3 text-xs leading-6 text-stone-500">
              {item.excerpt}
            </p>
            <div className="mt-5 flex items-center gap-2 border-t border-stone-900/8 pt-4 text-[10px] text-stone-400">
              <Music2 className="size-3.5" />
              <span>
                {item.track_title} · {item.artist_name}
              </span>
              <span className="ml-auto">
                by {item.profiles?.display_name ?? "a listener"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
