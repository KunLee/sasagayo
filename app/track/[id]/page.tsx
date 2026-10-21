import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import TrackList from "@/components/TrackList";
import { toPlayerTrack } from "@/components/player/types";
import { composerTracks, getTrack, getWork } from "@/lib/catalog";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { formatDuration, SITE_URL, sourceLabel } from "@/lib/format";
import { composerLabel } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import TrackActions from "./TrackActions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

const isoDuration = (seconds: number) => `PT${Math.floor(seconds / 60)}M${Math.round(seconds % 60)}S`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t, locale } = await getI18n();
  const track = await getTrack((await params).id).catch(() => null);
  if (!track) return { title: t.track.notFound };
  const composer = composerLabel(COMPOSER_BY_SLUG.get(track.composer_slug), locale, track.composer_name).name;
  const description = t.track.metaDescription(composer, track.performer, formatDuration(track.duration_seconds), track.license_name);
  return {
    title: `${track.title} — ${composer}`,
    description,
    alternates: { canonical: `/track/${track.id}` },
    openGraph: { title: track.title, description, type: "music.song", audio: track.stream_url },
    twitter: { title: track.title, description },
  };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const track = await getTrack((await params).id);
  if (!track) notFound();
  const { t, locale } = await getI18n();
  const startAt = Math.max(0, Math.min(track.duration_seconds - 5, Number((await searchParams).t) || 0));
  const composer = COMPOSER_BY_SLUG.get(track.composer_slug);
  const label = composerLabel(composer, locale, track.composer_name);
  const [work, more] = await Promise.all([
    track.work_key ? getWork(track.work_key).catch(() => null) : Promise.resolve(null),
    composerTracks(track.composer_slug, 1, 11).then((result) => result.tracks.filter((item) => item.id !== track.id).slice(0, 10)).catch(() => []),
  ]);
  // Playing on from this page follows the work first, then the composer's best.
  const workRest = work ? work.slice(work.findIndex((item) => item.id === track.id) + 1) : [];
  const related = [...workRest, ...more.filter((item) => !workRest.some((next) => next.id === item.id))];
  const description = track.description && track.description !== track.title ? track.description : "";
  const freeText = track.license_name === "Public domain" || track.license_name === "CC0" ? t.track.publicDomain : t.track.openLicence(track.license_name.includes("SA"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: track.title,
        url: `${SITE_URL}/track/${track.id}`,
        duration: isoDuration(track.duration_seconds),
        license: track.license_url || undefined,
        ...(track.performer ? { byArtist: { "@type": "MusicGroup", name: track.performer } } : {}),
        recordingOf: {
          "@type": "MusicComposition",
          name: track.work_title ?? track.title,
          composer: { "@type": "Person", name: track.composer_name, url: `${SITE_URL}/composers/${track.composer_slug}` },
        },
        audio: { "@type": "AudioObject", contentUrl: track.stream_url, encodingFormat: "audio/mpeg", duration: isoDuration(track.duration_seconds) },
        isAccessibleForFree: true,
      }} />
      <Link href={`/composers/${track.composer_slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" />{label.name}
      </Link>

      <article className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="eyebrow">{composer ? `${label.name} · ${composer.born}–${composer.died}` : label.name}</p>
          {work && track.work_title && (
            <p className="mt-3 text-sm text-muted">
              {t.work.partOf}{" "}
              <Link href={`/works/${track.work_key}`} className="font-semibold text-accent hover:underline">{track.work_title}</Link>
              {" · "}{t.list.movement(track.movement_number ?? 0)}
            </p>
          )}
          <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.75rem)]">{track.title}</h1>
          {track.recorded_year && (
            <p className="mt-4 max-w-2xl text-sm text-muted">
              <span className="mr-2 inline-block rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-ink">{t.track.historical(track.recorded_year)}</span>
              {t.track.historicalNote}
            </p>
          )}
          <p className="mt-4 text-lg text-ink-2">
            {track.performer ? <>{t.track.performedBy} <span className="font-medium">{track.performer}</span></> : <span className="text-muted">{t.track.notCredited}</span>}
            <span className="text-muted"> · {formatDuration(track.duration_seconds)}</span>
          </p>
          <div className="mt-8">
            <TrackActions track={toPlayerTrack(track)} related={related.map(toPlayerTrack)} startAt={startAt} downloadUrl={track.original_url} />
          </div>
          {description && (
            <p className="mt-10 max-w-2xl border-l-2 border-gold/50 pl-5 text-sm leading-7 text-ink-2">{description.slice(0, 700)}</p>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-card p-6 text-sm">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-accent" />{t.track.freeToShare}</p>
          <dl className="mt-4 grid gap-3">
            <div><dt className="text-xs text-muted">{t.track.licence}</dt><dd>{track.license_url ? <a href={track.license_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{track.license_name}</a> : track.license_name}</dd></div>
            <div><dt className="text-xs text-muted">{t.track.credit}</dt><dd className="leading-6 [overflow-wrap:anywhere]">{track.attribution}</dd></div>
            <div><dt className="text-xs text-muted">{t.track.source}</dt><dd><a href={track.source_page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{sourceLabel(track.source)}<ExternalLink className="size-3" /></a></dd></div>
          </dl>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">{freeText}</p>
        </aside>
      </article>

      {work && (
        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t.work.eyebrow}</p>
              <h2 className="display mt-2 text-4xl">{track.work_title}</h2>
            </div>
            <Link href={`/works/${track.work_key}`} className="shrink-0 text-sm font-semibold text-accent">{t.work.allMovements(work.length)} →</Link>
          </div>
          <div className="mt-6"><TrackList tracks={work} showComposer={false} movementNumbers={work.map((item) => item.movement_number)} /></div>
        </section>
      )}

      {more.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="display text-4xl">{t.track.more(label.short)}</h2>
            <Link href={`/composers/${track.composer_slug}`} className="text-sm font-semibold text-accent">{t.track.seeAll}</Link>
          </div>
          <div className="mt-6"><TrackList tracks={more} showComposer={false} /></div>
        </section>
      )}
    </div>
  );
}
