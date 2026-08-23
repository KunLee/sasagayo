import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Music2 } from "lucide-react";
import StoryActions from "./StoryActions";
import { stories, type Story } from "@/lib/community";
import { getSupabaseConfig } from "@/lib/server/supabase-session";
import StoryPlayer from "@/components/StoryPlayer";

type DisplayStory = Story & { id?: string; mediaAssetId?: string };

async function loadStory(slug: string): Promise<DisplayStory | undefined> {
  const curated = stories.find((item) => item.slug === slug);
  if (curated) return curated;
  const { url, publishableKey } = getSupabaseConfig();
  const result = await fetch(
    `${url}/rest/v1/stories?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug,title,excerpt,body,category,mood,track_title,artist_name,media_asset_id,published_at,profiles!stories_author_id_fkey(handle,display_name,location)&limit=1`,
    { headers: { apikey: publishableKey }, cache: "no-store" },
  );
  if (!result.ok) return undefined;
  const record = (await result.json())[0];
  if (!record) return undefined;
  const profile = record.profiles ?? {};
  const displayName = profile.display_name ?? "Sasagayo listener";
  return {
    id: record.id,
    mediaAssetId: record.media_asset_id,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    body: String(record.body).split(/\n\s*\n/),
    category: record.category,
    mood: record.mood,
    track: record.track_title,
    artist: record.artist_name,
    author: displayName,
    handle: profile.handle ?? "listener",
    location: profile.location || "Somewhere listening",
    initials: displayName
      .split(/\s+/)
      .map((part: string) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    color: "#806b77",
    reactions: 0,
    comments: 0,
    time: "Recently",
  };
}

export function generateStaticParams() {
  return stories.map((story) => ({ slug: story.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await loadStory(slug);
  return story ? { title: story.title, description: story.excerpt } : {};
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) notFound();
  return (
    <article>
      <header className="bg-[#2a2025] text-[#f8f2e9]">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-8 lg:py-20">
          <Link
            href="/stories"
            className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            All stories
          </Link>
          <p className="micro-label mt-12 text-[#d48169]">
            {story.category} · {story.mood}
          </p>
          <h1 className="mt-5 font-serif text-5xl leading-[.94] tracking-[-.04em] sm:text-7xl">
            {story.title}
          </h1>
          <div className="mt-8 flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: story.color }}
            >
              {story.initials}
            </span>
            <div>
              <Link
                href={`/profile/${story.handle}`}
                className="text-sm font-semibold"
              >
                {story.author}
              </Link>
              <p className="text-[10px] text-stone-500">
                {story.location} · {story.time}
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-4xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1fr_220px] lg:py-16">
        <div>
          <p className="font-serif text-2xl leading-9 text-stone-700">
            {story.excerpt}
          </p>
          <div className="mt-9 space-y-7 text-[15px] leading-8 text-stone-600">
            {story.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <StoryActions
            storyId={story.id}
            initialReactions={story.reactions}
            initialComments={story.comments}
          />
        </div>
        <aside>
          <div className="sticky top-28 rounded-2xl bg-[#e8ded0] p-5">
            <span className="grid size-10 place-items-center rounded-full bg-[#2b2025] text-white">
              <Music2 className="size-4" />
            </span>
            <p className="micro-label mt-5 text-[#a74735]">The song inside</p>
            <h2 className="mt-2 font-serif text-xl">{story.track}</h2>
            <p className="mt-1 text-xs text-stone-500">{story.artist}</p>
            {story.mediaAssetId && <StoryPlayer assetId={story.mediaAssetId} title={story.track} artist={story.artist} />}
            <Link
              href={`/search?q=${encodeURIComponent(story.artist)}`}
              className="mt-5 block rounded-full border border-stone-900/10 py-2.5 text-center text-[10px] font-semibold"
            >
              Find related stories
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
