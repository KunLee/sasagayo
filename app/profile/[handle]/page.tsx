import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Headphones, MapPin, Music2 } from "lucide-react";
import StoryCard from "@/components/StoryCard";
import { stories } from "@/lib/community";
export function generateStaticParams() {
  return [...new Set(stories.map((story) => story.handle))].map((handle) => ({
    handle,
  }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const person = stories.find((story) => story.handle === handle);
  return person
    ? {
        title: person.author,
        description: `Stories and recommendations from ${person.author}.`,
      }
    : {};
}
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const authored = stories.filter((story) => story.handle === handle);
  const person = authored[0];
  if (!person) notFound();
  return (
    <div>
      <header className="border-b border-stone-900/8 bg-[#e8ded0]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-7 px-6 py-14 sm:flex-row sm:items-end sm:px-8 lg:py-20">
          <span
            className="grid size-24 place-items-center rounded-[30px] font-serif text-3xl text-white shadow-xl"
            style={{ backgroundColor: person.color }}
          >
            {person.initials}
          </span>
          <div>
            <p className="micro-label text-[#a74735]">Listener profile</p>
            <h1 className="mt-3 font-serif text-5xl tracking-[-.04em] sm:text-6xl">
              {person.author}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
              <MapPin className="size-3.5" />
              {person.location} · @{person.handle}
            </p>
          </div>
          <div className="sm:ml-auto sm:text-right">
            <p className="font-serif text-2xl">{authored.length}</p>
            <p className="micro-label text-stone-400">Stories shared</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1100px] px-6 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[240px_1fr]">
          <aside>
            <Headphones className="size-5 text-[#a74735]" />
            <h2 className="mt-4 font-serif text-2xl">Listening note</h2>
            <p className="mt-3 text-sm leading-7 text-stone-500">
              Collecting songs that make ordinary places feel briefly cinematic.
            </p>
            <div className="mt-7 rounded-2xl bg-white/55 p-4">
              <Music2 className="size-4 text-[#a74735]" />
              <p className="micro-label mt-3 text-stone-400">
                Often listening for
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                Memory · place · quiet surprise
              </p>
            </div>
          </aside>
          <section>
            <h2 className="font-serif text-3xl">Stories by {person.author}</h2>
            <div className="mt-6 grid gap-5">
              {authored.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
