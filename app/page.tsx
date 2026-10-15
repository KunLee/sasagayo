import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ComposerCard from "@/components/ComposerCard";
import SearchBox from "@/components/SearchBox";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { composerCounts, dailyProgramme, latestTracks, libraryStats, type Track } from "@/lib/catalog";
import { composerPortraits } from "@/lib/composer-info";
import { COMPOSERS, ERAS } from "@/lib/composers";

export const revalidate = 600;

const SUGGESTIONS = ["Chopin nocturne", "Bach cello suite", "Moonlight sonata", "Mozart Requiem", "Debussy", "贝多芬 交响曲", "Vivaldi Four Seasons", "Schubert lieder"];

async function safely<T>(load: () => Promise<T>, fallback: T) {
  try {
    return await load();
  } catch (error) {
    console.error("Home page data unavailable", error);
    return fallback;
  }
}

export default async function HomePage() {
  const [stats, programme, latest, counts] = await Promise.all([
    safely(libraryStats, { tracks: 0, hours: 0, composers: 0 }),
    safely(() => dailyProgramme(8), [] as Track[]),
    safely(() => latestTracks(10), [] as Track[]),
    safely(composerCounts, new Map<string, { tracks: number; seconds: number }>()),
  ]);
  const featured = [...COMPOSERS]
    .sort((a, b) => (counts.get(b.slug)?.tracks ?? 0) - (counts.get(a.slug)?.tracks ?? 0))
    .slice(0, 12);
  const portraits = await composerPortraits(featured);
  const today = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <section className="paper-grain border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-24">
          <p className="eyebrow">An open library of classical music</p>
          <h1 className="display mt-5 max-w-4xl text-[clamp(3rem,8vw,6.5rem)]">
            Great recordings,<br />
            <em className="font-normal text-accent">free</em> to hear and share.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2 sm:text-lg">
            Every day Sasagayo searches public archives for real performances of the great composers — checks the
            licence, credits the performers, and adds the best to the shelves.
          </p>
          {stats.tracks > 0 && (
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
              {[[stats.tracks.toLocaleString("en"), "recordings"], [stats.hours.toLocaleString("en"), "hours of music"], [String(stats.composers), "composers"]].map(([value, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-serif text-4xl font-medium tabular-nums">{value}</dd>
                  <span className="text-sm text-muted">{label}</span>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-10 max-w-2xl">
            <SearchBox size="hero" />
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((term) => (
                <Link key={term} href={`/search?q=${encodeURIComponent(term)}`} className="rounded-full border border-line bg-card/60 px-3 py-1.5 text-xs text-ink-2 transition hover:border-accent hover:text-accent">
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {programme.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Today&apos;s programme · {today}</p>
              <h2 className="display mt-3 text-5xl">An evening concert</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Eight pieces by eight composers, chosen from the finest recordings in the library. A new programme every day.</p>
            </div>
            <PlayAllButton tracks={programme} label="Play the programme" />
          </div>
          <div className="mt-8"><TrackList tracks={programme} /></div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-4 pt-20 text-center sm:px-6">
          <p className="ornament font-serif text-2xl">❦</p>
          <h2 className="display mt-6 text-4xl">The shelves are being filled.</h2>
          <p className="mt-4 text-sm leading-6 text-muted">The first recordings arrive with the next discovery run. Check back soon.</p>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The composers</p>
            <h2 className="display mt-3 text-5xl">Who would you like to hear?</h2>
          </div>
          <Link href="/composers" className="hidden items-center gap-2 text-sm font-semibold text-accent sm:flex">All composers <ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
          {featured.map((composer) => (
            <ComposerCard key={composer.slug} composer={composer} portrait={portraits.get(composer.slug) ?? null} tracks={counts.get(composer.slug)?.tracks} />
          ))}
        </div>
        <Link href="/composers" className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-accent sm:hidden">All composers <ArrowRight className="size-4" /></Link>
      </section>

      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <p className="eyebrow">Just added</p>
          <h2 className="display mt-3 text-5xl">Fresh from the archives</h2>
          <div className="mt-8"><TrackList tracks={latest} /></div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <p className="eyebrow">Five centuries</p>
        <h2 className="display mt-3 text-5xl">Browse by era</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ERAS.map((era, position) => (
            <Link key={era.name} href={`/composers#${era.name.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="group flex min-h-48 flex-col rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-1 hover:border-accent hover:shadow-lg">
              <span className="font-serif text-sm italic text-gold">{["I", "II", "III", "IV", "V"][position]}</span>
              <span className="mt-auto font-serif text-2xl leading-tight group-hover:text-accent">{era.name}</span>
              <span className="mt-1 text-[11px] uppercase tracking-wider text-muted">{era.span}</span>
              <span className="mt-3 text-xs leading-5 text-muted">{era.blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
