import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import StoryCard from "@/components/StoryCard";
import CommunityStoryFeed from "@/components/CommunityStoryFeed";
import { stories } from "@/lib/community";

export const metadata: Metadata = {
  title: "Stories",
  description: "Personal stories and the music held inside them.",
};

export default function StoriesPage() {
  return (
    <div className="mx-auto max-w-[1300px] px-6 py-14 sm:px-8 lg:py-20">
      <header className="flex flex-col justify-between gap-8 border-b border-stone-900/8 pb-12 sm:flex-row sm:items-end">
        <div>
          <p className="micro-label text-[#a74735]">Community journal</p>
          <h1 className="mt-4 font-serif text-6xl tracking-[-.045em] sm:text-8xl">
            Stories with
            <br />
            <em className="font-normal text-[#a74735]">a soundtrack.</em>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-stone-500">
            Memories, discoveries, rituals, and reflections—recommended by
            people who know why the song matters.
          </p>
        </div>
        <Link
          href="/compose"
          className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#2b2025] px-6 text-xs font-semibold text-white"
        >
          <PenLine className="size-4" />
          Tell your story
        </Link>
      </header>
      <div className="mt-10 flex flex-wrap gap-2">
        {["All stories", "Memory", "Discovery", "Reflection", "Ritual"].map(
          (filter, index) => (
            <span
              key={filter}
              className={`rounded-full px-4 py-2 text-xs ${index === 0 ? "bg-[#a74735] text-white" : "border border-stone-900/10 bg-white/35 text-stone-500"}`}
            >
              {filter}
            </span>
          ),
        )}
      </div>
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        {stories.map((story, index) => (
          <StoryCard key={story.slug} story={story} featured={index === 0} />
        ))}
      </section>
      <CommunityStoryFeed />
      <div className="mt-14 rounded-[28px] bg-[#e6ddd0] p-8 text-center sm:p-12">
        <p className="micro-label text-[#a74735]">There is room for yours</p>
        <h2 className="mt-3 font-serif text-4xl">
          A song becomes a recommendation
          <br className="hidden sm:block" /> when you tell us why.
        </h2>
        <Link
          href="/compose"
          className="mt-7 inline-flex rounded-full bg-[#a74735] px-6 py-3 text-xs font-semibold text-white"
        >
          Share something meaningful
        </Link>
      </div>
    </div>
  );
}
