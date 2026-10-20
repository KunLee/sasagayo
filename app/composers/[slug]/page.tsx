import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import ShareButton from "@/components/ShareButton";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import WorkCard from "@/components/WorkCard";
import { composerCounts, composerTracks, composerWorks } from "@/lib/catalog";
import { composerInfo } from "@/lib/composer-info";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { SITE_URL } from "@/lib/format";
import { composerLabel } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

const PAGE_SIZE = 40;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const composer = COMPOSER_BY_SLUG.get((await params).slug);
  if (!composer) return {};
  const { t, locale } = await getI18n();
  const name = composerLabel(composer, locale).name;
  return {
    title: t.composer.metaTitle(name),
    description: t.composer.metaDescription(name, `${composer.born}–${composer.died}`),
    alternates: { canonical: `/composers/${composer.slug}` },
  };
}

export default async function ComposerPage({ params, searchParams }: Props) {
  const composer = COMPOSER_BY_SLUG.get((await params).slug);
  if (!composer) notFound();
  const { t, locale } = await getI18n();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [info, list, counts, works] = await Promise.all([
    composerInfo(composer, locale),
    composerTracks(composer.slug, page, PAGE_SIZE).catch(() => ({ tracks: [], total: 0 })),
    composerCounts().catch(() => new Map<string, { tracks: number; seconds: number }>()),
    page === 1 ? composerWorks(composer.slug) : Promise.resolve([]),
  ]);
  const pages = Math.ceil(list.total / PAGE_SIZE);
  const seconds = counts.get(composer.slug)?.seconds ?? 0;
  const label = composerLabel(composer, locale);
  const era = t.eras[composer.era];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name: composer.name,
        alternateName: composer.zh,
        birthDate: String(composer.born),
        deathDate: String(composer.died),
        jobTitle: "Composer",
        url: `${SITE_URL}/composers/${composer.slug}`,
        ...(info.portrait ? { image: info.portrait } : {}),
        sameAs: [info.wikiUrl],
      }} />
      <Link href="/composers" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />{t.composer.back}</Link>
      <header className="mt-8 grid gap-8 md:grid-cols-[200px_1fr] md:items-end">
        <div className="mx-auto aspect-square w-44 overflow-hidden rounded-full border border-line bg-paper-2 shadow-xl md:mx-0 md:w-full">
          {info.portrait
            // eslint-disable-next-line @next/next/no-img-element -- remote Wikimedia thumbnail
            ? <img src={info.portrait} alt={label.name} className="size-full object-cover object-top" />
            : <span className="grid size-full place-items-center font-serif text-6xl italic text-muted">{label.short[0]}</span>}
        </div>
        <div>
          <p className="eyebrow">{era.name} · {composer.born}–{composer.died}</p>
          <h1 className="display mt-3 text-[clamp(2.75rem,7vw,5.25rem)]">{label.name}</h1>
          <p className="mt-1 font-serif text-2xl text-muted">{locale === "zh" ? composer.name : composer.zh}</p>
          {info.extract && <p className="mt-5 max-w-3xl text-sm leading-7 text-ink-2">{info.extract}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <a href={info.wikiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-accent">{t.composer.wikipedia} <ExternalLink className="size-3.5" /></a>
            <ShareButton path={`/composers/${composer.slug}`} title={`${label.name} · Sasagayo`} text={t.composer.shareText(label.name)} className="inline-flex items-center gap-1.5 text-muted hover:text-accent" />
          </div>
        </div>
      </header>

      {works.length > 0 && (
        <section className="mt-14">
          <h2 className="display text-4xl">{t.composer.worksTitle}</h2>
          <p className="mt-1 text-sm text-muted">{t.composer.worksIntro}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => <WorkCard key={work.work_key} work={work} locale={locale} showComposer={false} />)}
          </div>
        </section>
      )}

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <h2 className="display text-4xl">{t.composer.recordingsTitle}</h2>
            <p className="mt-1 text-sm text-muted">{t.composer.inLibrary(list.total)}{seconds ? ` · ${t.time.total(seconds)}` : ""} · {t.composer.bestFirst}</p>
          </div>
          <PlayAllButton tracks={list.tracks} label={page > 1 ? t.composer.playPage : undefined} />
        </div>
        <div className="mt-2">
          <TrackList tracks={list.tracks} showComposer={false} startNumber={(page - 1) * PAGE_SIZE + 1} emptyMessage={t.composer.empty(label.short)} />
        </div>
        {pages > 1 && (
          <nav aria-label={t.pages.of(page, pages)} className="mt-8 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={`?page=${page - 1}`} className="inline-flex items-center gap-2 font-semibold text-accent"><ArrowLeft className="size-4" />{t.pages.previous}</Link> : <span />}
            <span className="text-muted">{t.pages.of(page, pages)}</span>
            {page < pages ? <Link href={`?page=${page + 1}`} className="inline-flex items-center gap-2 font-semibold text-accent">{t.pages.next}<ArrowRight className="size-4" /></Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
