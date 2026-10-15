import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { composerCounts, composerTracks } from "@/lib/catalog";
import { composerInfo } from "@/lib/composer-info";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { formatTotal } from "@/lib/format";

export const revalidate = 600;
const PAGE_SIZE = 40;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const composer = COMPOSER_BY_SLUG.get((await params).slug);
  if (!composer) return {};
  return {
    title: `${composer.name} — recordings`,
    description: `Listen to open-licence recordings of ${composer.name} (${composer.born}–${composer.died}), free to stream and share.`,
  };
}

export default async function ComposerPage({ params, searchParams }: Props) {
  const composer = COMPOSER_BY_SLUG.get((await params).slug);
  if (!composer) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [info, list, counts] = await Promise.all([
    composerInfo(composer),
    composerTracks(composer.slug, page, PAGE_SIZE).catch(() => ({ tracks: [], total: 0 })),
    composerCounts().catch(() => new Map<string, { tracks: number; seconds: number }>()),
  ]);
  const pages = Math.ceil(list.total / PAGE_SIZE);
  const seconds = counts.get(composer.slug)?.seconds ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/composers" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All composers</Link>
      <header className="mt-8 grid gap-8 md:grid-cols-[200px_1fr] md:items-end">
        <div className="mx-auto aspect-square w-44 overflow-hidden rounded-full border border-line bg-paper-2 shadow-xl md:mx-0 md:w-full">
          {info.portrait
            // eslint-disable-next-line @next/next/no-img-element -- remote Wikimedia thumbnail
            ? <img src={info.portrait} alt={`Portrait of ${composer.name}`} className="size-full object-cover object-top" />
            : <span className="grid size-full place-items-center font-serif text-6xl italic text-muted">{composer.short[0]}</span>}
        </div>
        <div>
          <p className="eyebrow">{composer.era} · {composer.born}–{composer.died}</p>
          <h1 className="display mt-3 text-[clamp(2.75rem,7vw,5.25rem)]">{composer.name}</h1>
          <p className="mt-1 font-serif text-2xl text-muted">{composer.zh}</p>
          {info.extract && <p className="mt-5 max-w-3xl text-sm leading-7 text-ink-2">{info.extract}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <a href={info.wikiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-accent">Wikipedia <ExternalLink className="size-3.5" /></a>
            <ShareButton path={`/composers/${composer.slug}`} title={`${composer.name} on Sasagayo`} text={`Free recordings of ${composer.name}`} className="inline-flex items-center gap-1.5 text-muted hover:text-accent" />
          </div>
        </div>
      </header>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <h2 className="display text-4xl">Recordings</h2>
            <p className="mt-1 text-sm text-muted">{list.total} in the library{seconds ? ` · ${formatTotal(seconds)}` : ""} · best first</p>
          </div>
          <PlayAllButton tracks={list.tracks} label={page > 1 ? "Play this page" : "Play all"} />
        </div>
        <div className="mt-2">
          <TrackList tracks={list.tracks} showComposer={false} startNumber={(page - 1) * PAGE_SIZE + 1} emptyMessage={`No recordings of ${composer.short} have been added yet — discovery runs every day.`} />
        </div>
        {pages > 1 && (
          <nav aria-label="Pages" className="mt-8 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={`?page=${page - 1}`} className="inline-flex items-center gap-2 font-semibold text-accent"><ArrowLeft className="size-4" />Previous</Link> : <span />}
            <span className="text-muted">Page {page} of {pages}</span>
            {page < pages ? <Link href={`?page=${page + 1}`} className="inline-flex items-center gap-2 font-semibold text-accent">Next<ArrowRight className="size-4" /></Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
