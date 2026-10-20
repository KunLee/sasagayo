import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { after } from "next/server";
import { track } from "@/lib/server/analytics";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { searchTracks } from "@/lib/catalog";
import { COMPOSERS, fold } from "@/lib/composers";
import { composerLabel } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

const PAGE_SIZE = 30;
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const { t } = await getI18n();
  return { title: q ? `“${q}”` : t.search.title, robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { t, locale } = await getI18n();
  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim().slice(0, 120);
  const page = Math.max(1, Number(pageParam) || 1);
  const result = query
    ? await searchTracks(query, { page, pageSize: PAGE_SIZE }).catch(() => null)
    : null;
  const pages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  if (result && page === 1) {
    const requestHeaders = await headers();
    // Logged once per query; zero-result searches show what the library is missing.
    after(() => track(requestHeaders, { type: "search", query: query.toLowerCase(), results: result.total, lang: locale }));
  }
  const folded = fold(query);
  const composerHits = query.length > 1
    ? COMPOSERS.filter((composer) => [composer.name, composer.short, composer.zh].some((name) => fold(name).includes(folded) || folded.includes(fold(name)))).slice(0, 6)
    : [];
  const pageLink = (target: number) => `?q=${encodeURIComponent(query)}&page=${target}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl"><SearchBox size="hero" defaultValue={query} autoFocus={!query} /></div>
      {composerHits.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{t.search.composerPages}</span>
          {composerHits.map((composer) => (
            <Link key={composer.slug} href={`/composers/${composer.slug}`} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-accent hover:text-accent">
              {composerLabel(composer, locale).name} <span className="text-muted">{locale === "zh" ? composer.name : composer.zh}</span>
            </Link>
          ))}
        </div>
      )}

      {!query && <p className="mt-10 max-w-xl text-sm leading-7 text-muted">{t.search.hint}</p>}
      {query && !result && <p className="mt-12 text-center text-sm text-muted">{t.search.unavailable}</p>}

      {result && (
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <h1 className="display text-4xl">{t.search.resultsFor(query)}</h1>
              <p className="mt-1 text-sm text-muted">{t.search.count(result.total)}</p>
            </div>
            <PlayAllButton tracks={result.tracks} label={t.search.playResults} />
          </div>
          <div className="mt-2">
            <TrackList tracks={result.tracks} startNumber={(page - 1) * PAGE_SIZE + 1} emptyMessage={t.search.empty} />
          </div>
          {pages > 1 && (
            <nav aria-label={t.pages.of(page, pages)} className="mt-8 flex items-center justify-between text-sm">
              {page > 1 ? <Link href={pageLink(page - 1)} className="inline-flex items-center gap-2 font-semibold text-accent"><ArrowLeft className="size-4" />{t.pages.previous}</Link> : <span />}
              <span className="text-muted">{t.pages.of(page, pages)}</span>
              {page < pages ? <Link href={pageLink(page + 1)} className="inline-flex items-center gap-2 font-semibold text-accent">{t.pages.next}<ArrowRight className="size-4" /></Link> : <span />}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
