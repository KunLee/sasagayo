"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import StoryCard from "@/components/StoryCard";
import { stories } from "@/lib/community";

const filters = ["All stories", "Memory", "Discovery", "Reflection", "Ritual"];

export default function StoryExplorer() {
  const [filter, setFilter] = useState("All stories");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return stories.filter((story) => {
      const matchesFilter = filter === "All stories" || story.category === filter;
      const matchesQuery =
        !needle ||
        [story.title, story.excerpt, story.track, story.artist, story.author, story.mood]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Filter stories">
          {filters.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-xs transition ${
                filter === item
                  ? "bg-[var(--theme-accent)] text-white shadow-sm"
                  : "border border-stone-900/10 bg-white/35 text-stone-500 hover:bg-white hover:text-stone-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="flex h-10 min-w-64 items-center gap-2 rounded-full border border-stone-900/10 bg-white/45 px-4 focus-within:bg-white">
          <Search className="size-3.5 text-stone-400" />
          <span className="sr-only">Search stories</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a song, feeling, or person"
            className="w-full bg-transparent text-xs outline-none placeholder:text-stone-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear story search">
              <X className="size-3.5 text-stone-400" />
            </button>
          )}
        </label>
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-wider text-stone-400" aria-live="polite">
        {visible.length} {visible.length === 1 ? "story" : "stories"} found
      </p>
      {visible.length ? (
        <section className="mt-4 grid gap-5 lg:grid-cols-2">
          {visible.map((story, index) => (
            <StoryCard key={story.slug} story={story} featured={index === 0 && filter === "All stories" && !query} />
          ))}
        </section>
      ) : (
        <section className="mt-4 rounded-[28px] border border-dashed border-stone-900/15 px-6 py-14 text-center">
          <p className="font-serif text-3xl">No story carries those words yet.</p>
          <button
            type="button"
            onClick={() => { setFilter("All stories"); setQuery(""); }}
            className="mt-4 text-xs font-semibold text-[var(--theme-accent)]"
          >
            Return to every story
          </button>
        </section>
      )}
    </div>
  );
}
