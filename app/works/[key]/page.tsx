import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import ShareButton from "@/components/ShareButton";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { getWork } from "@/lib/catalog";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { SITE_URL } from "@/lib/format";
import { composerLabel } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const movements = await getWork(key).catch(() => null);
  if (!movements) return {};
  const { t, locale } = await getI18n();
  const first = movements[0];
  const composer = composerLabel(COMPOSER_BY_SLUG.get(first.composer_slug), locale, first.composer_name).name;
  const title = first.work_title ?? first.title;
  const description = t.work.metaDescription(title, composer, movements.length);
  return { title: `${title} — ${composer}`, description, alternates: { canonical: `/works/${key}` }, openGraph: { title, description } };
}

export default async function WorkPage({ params }: Props) {
  const { key } = await params;
  const movements = await getWork(key);
  if (!movements) notFound();
  const { t, locale } = await getI18n();
  const first = movements[0];
  const composer = COMPOSER_BY_SLUG.get(first.composer_slug);
  const label = composerLabel(composer, locale, first.composer_name);
  const title = first.work_title ?? first.title;
  const seconds = movements.reduce((sum, track) => sum + track.duration_seconds, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "MusicPlaylist",
        name: title,
        url: `${SITE_URL}/works/${key}`,
        numTracks: movements.length,
        track: movements.map((track) => ({ "@type": "MusicRecording", name: track.title, url: `${SITE_URL}/track/${track.id}` })),
      }} />
      <Link href={`/composers/${first.composer_slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />{label.name}</Link>
      <header className="mt-10">
        <p className="eyebrow">{t.work.eyebrow} · {label.name}{composer ? ` · ${composer.born}–${composer.died}` : ""}</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.75rem)]">{title}</h1>
        <p className="mt-4 text-lg text-ink-2">
          {first.performer ? t.work.performedBy(first.performer) : t.track.notCredited}
          <span className="text-muted"> · {t.work.movements(movements.length)} · {t.time.total(seconds)}</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <PlayAllButton tracks={movements} label={t.work.play} />
          <ShareButton
            path={`/works/${key}`}
            title={`${title} — ${label.name}`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold transition hover:border-accent hover:text-accent"
          />
        </div>
      </header>
      <div className="mt-10">
        <TrackList tracks={movements} showComposer={false} movementNumbers={movements.map((track) => track.movement_number)} />
      </div>
    </div>
  );
}
