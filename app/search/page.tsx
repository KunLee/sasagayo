import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { searchTracks } from "@/lib/catalog";
import { COMPOSERS, fold } from "@/lib/composers";

const PAGE_SIZE = 30;
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}”` : "Search", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim().slice(0, 120);
  const page = Math.max(1, Number(pageParam) || 1);
  const result = query
    ? await searchTracks(query, { page, pageSize: PAGE_SIZE }).catch(() => null)
    : null;
  const pages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const folded = fold(query);
  const composerHits = query.length > 1
    ? COMPOSERS.filter((composer) => [composer.name, composer.short, composer.zh].some((name) => fold(name).includes(folded) || folded.includes(fold(name)))).slice(0, 6)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl"><SearchBox size="hero" defaultValue={query} autoFocus={!query} /></div>
      {composerHits.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Composer pages:</span>
          {composerHits.map((composer) => (
            <Link key={composer.slug} href={`/composers/${composer.slug}`} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-accent hover:text-accent">
              {composer.name} <span className="text-muted">{composer.zh}</span>
            </Link>
          ))}
        </div>
      )}

      {!query && (
        <p className="mt-10 max-w-xl text-sm leading-7 text-muted">
          Search by composer, work, catalogue number, performer, or instrument — in English or Chinese. For example
          “BWV 1007”, “Rachmaninoff prelude”, “string quartet”, or “莫扎特 安魂曲”.
        </p>
      )}

      {query && !result && (
        <p className="mt-12 text-center text-sm text-muted">The library could not be searched just now. Please try again in a moment.</p>
      )}

      {result && (
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <h1 className="display text-4xl">Results for “{query}”</h1>
              <p className="mt-1 text-sm text-muted">{result.total.toLocaleString("en")} recording{result.total === 1 ? "" : "s"}, best first</p>
            </div>
            <PlayAllButton tracks={result.tracks} label="Play results" />
          </div>
          <div className="mt-2">
            <TrackList
              tracks={result.tracks}
              startNumber={(page - 1) * PAGE_SIZE + 1}
              emptyMessage="No recordings match yet. Try fewer words, or just a composer's name."
            />
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-between text-sm">
              {page > 1 ? <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`} className="inline-flex items-center gap-2 font-semibold text-accent"><ArrowLeft className="size-4" />Previous</Link> : <span />}
              <span className="text-muted">Page {page} of {pages}</span>
              {page < pages ? <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`} className="inline-flex items-center gap-2 font-semibold text-accent">Next<ArrowRight className="size-4" /></Link> : <span />}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
