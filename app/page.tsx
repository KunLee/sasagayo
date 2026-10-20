import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ComposerCard from "@/components/ComposerCard";
import JsonLd from "@/components/JsonLd";
import SearchBox from "@/components/SearchBox";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import WorkCard from "@/components/WorkCard";
import { composerCounts, dailyProgramme, featuredWorks, latestTracks, libraryStats, type Track, type Work } from "@/lib/catalog";
import { composerPortraits } from "@/lib/composer-info";
import { COMPOSERS, ERAS, eraAnchor } from "@/lib/composers";
import { SITE_URL } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { alternates: { canonical: "/" } };

async function safely<T>(load: () => Promise<T>, fallback: T) {
  try {
    return await load();
  } catch (error) {
    console.error("Home page data unavailable", error);
    return fallback;
  }
}

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const [stats, programme, latest, counts, works] = await Promise.all([
    safely(libraryStats, { tracks: 0, hours: 0, composers: 0 }),
    safely(() => dailyProgramme(8), [] as Track[]),
    safely(() => latestTracks(10), [] as Track[]),
    safely(composerCounts, new Map<string, { tracks: number; seconds: number }>()),
    safely(() => featuredWorks(6), [] as Work[]),
  ]);
  const featured = [...COMPOSERS]
    .sort((a, b) => (counts.get(b.slug)?.tracks ?? 0) - (counts.get(a.slug)?.tracks ?? 0))
    .slice(0, 12);
  const portraits = await composerPortraits(featured);
  const today = new Intl.DateTimeFormat(t.dateLocale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Sasagayo",
        url: SITE_URL,
        description: t.site.description,
        inLanguage: ["en", "zh-CN"],
        potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={query}`, "query-input": "required name=query" },
      }} />
      <section className="paper-grain border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-24">
          <p className="eyebrow">{t.home.eyebrow}</p>
          <h1 className="display mt-5 max-w-4xl text-[clamp(3rem,8vw,6.5rem)]">
            {t.home.titleA}<br />
            <em className="font-normal text-accent">{t.home.titleFree}</em>{locale === "zh" ? "" : " "}{t.home.titleB}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2 sm:text-lg">{t.home.intro}</p>
          {stats.tracks > 0 && (
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
              {[[stats.tracks.toLocaleString(t.dateLocale), t.home.stats.recordings], [stats.hours.toLocaleString(t.dateLocale), t.home.stats.hours], [String(stats.composers), t.home.stats.composers]].map(([value, label]) => (
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
              {t.home.suggestions.map((term) => (
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
              <p className="eyebrow">{t.home.programmeEyebrow(today)}</p>
              <h2 className="display mt-3 text-5xl">{t.home.programmeTitle}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{t.home.programmeIntro(programme.length)}</p>
            </div>
            <PlayAllButton tracks={programme} label={t.home.playProgramme} />
          </div>
          <div className="mt-8"><TrackList tracks={programme} /></div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-4 pt-20 text-center sm:px-6">
          <p className="ornament font-serif text-2xl">❦</p>
          <h2 className="display mt-6 text-4xl">{t.home.emptyTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-muted">{t.home.emptyBody}</p>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t.home.composersEyebrow}</p>
            <h2 className="display mt-3 text-5xl">{t.home.composersTitle}</h2>
          </div>
          <Link href="/composers" className="hidden items-center gap-2 text-sm font-semibold text-accent sm:flex">{t.home.allComposers} <ArrowRight className="size-4" /></Link>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
          {featured.map((composer) => (
            <ComposerCard key={composer.slug} composer={composer} portrait={portraits.get(composer.slug) ?? null} tracks={counts.get(composer.slug)?.tracks} locale={locale} />
          ))}
        </div>
        <Link href="/composers" className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-accent sm:hidden">{t.home.allComposers} <ArrowRight className="size-4" /></Link>
      </section>

      {works.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <p className="eyebrow">{t.home.worksEyebrow}</p>
          <h2 className="display mt-3 text-5xl">{t.home.worksTitle}</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => <WorkCard key={work.work_key} work={work} locale={locale} />)}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <p className="eyebrow">{t.home.justAdded}</p>
          <h2 className="display mt-3 text-5xl">{t.home.freshTitle}</h2>
          <div className="mt-8"><TrackList tracks={latest} /></div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <p className="eyebrow">{t.home.erasEyebrow}</p>
        <h2 className="display mt-3 text-5xl">{t.home.erasTitle}</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ERAS.map((era, position) => {
            const label = t.eras[era.name];
            return (
              <Link key={era.name} href={`/composers#${eraAnchor(era.name)}`} className="group flex min-h-48 flex-col rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-1 hover:border-accent hover:shadow-lg">
                <span className="font-serif text-sm italic text-gold">{["I", "II", "III", "IV", "V"][position]}</span>
                <span className="mt-auto font-serif text-2xl leading-tight group-hover:text-accent">{label.name}</span>
                <span className="mt-1 text-[11px] uppercase tracking-wider text-muted">{label.span}</span>
                <span className="mt-3 text-xs leading-5 text-muted">{label.blurb}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Dedication: the site is named after a word Alice used to sing. */}
      <section className="mx-auto max-w-3xl px-4 pt-28 text-center sm:px-6">
        <p className="ornament font-serif text-xl" aria-hidden>❦</p>
        <p className="mt-6 font-serif text-2xl italic leading-snug text-ink-2 sm:text-3xl">{t.dedication}</p>
      </section>
    </>
  );
}
