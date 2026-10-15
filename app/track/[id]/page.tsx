import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import TrackList from "@/components/TrackList";
import { toPlayerTrack } from "@/components/player/types";
import { composerTracks, getTrack } from "@/lib/catalog";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { formatDuration, sourceLabel } from "@/lib/format";
import TrackActions from "./TrackActions";

export const revalidate = 3600;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = await getTrack((await params).id).catch(() => null);
  if (!track) return { title: "Recording not found" };
  const description = `${track.composer_name}${track.performer ? ` · performed by ${track.performer}` : ""} · ${formatDuration(track.duration_seconds)} · free to listen and share (${track.license_name}).`;
  return {
    title: `${track.title} — ${track.composer_name}`,
    description,
    openGraph: { title: track.title, description, type: "music.song", audio: track.stream_url },
    twitter: { title: track.title, description },
  };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const track = await getTrack((await params).id);
  if (!track) notFound();
  const startAt = Math.max(0, Math.min(track.duration_seconds - 5, Number((await searchParams).t) || 0));
  const composer = COMPOSER_BY_SLUG.get(track.composer_slug);
  const more = await composerTracks(track.composer_slug, 1, 11).then((result) => result.tracks.filter((item) => item.id !== track.id).slice(0, 10)).catch(() => []);
  const description = track.description && track.description !== track.title ? track.description : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href={`/composers/${track.composer_slug}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" />{track.composer_name}
      </Link>

      <article className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="eyebrow">{composer ? `${composer.name} · ${composer.born}–${composer.died}` : track.composer_name}</p>
          <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.75rem)]">{track.title}</h1>
          <p className="mt-4 text-lg text-ink-2">
            {track.performer ? <>Performed by <span className="font-medium">{track.performer}</span></> : <span className="text-muted">Performer not credited</span>}
            <span className="text-muted"> · {formatDuration(track.duration_seconds)}</span>
          </p>
          <div className="mt-8">
            <TrackActions track={toPlayerTrack(track)} related={more.map(toPlayerTrack)} startAt={startAt} downloadUrl={track.original_url} />
          </div>
          {description && (
            <p className="mt-10 max-w-2xl border-l-2 border-gold/50 pl-5 text-sm leading-7 text-ink-2">{description.slice(0, 700)}</p>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-card p-6 text-sm">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-accent" />Free to share</p>
          <dl className="mt-4 grid gap-3">
            <div><dt className="text-xs text-muted">Licence</dt><dd>{track.license_url ? <a href={track.license_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{track.license_name}</a> : track.license_name}</dd></div>
            <div><dt className="text-xs text-muted">Credit when sharing</dt><dd className="leading-6">{track.attribution}</dd></div>
            <div><dt className="text-xs text-muted">Source</dt><dd><a href={track.source_page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{sourceLabel(track.source)}<ExternalLink className="size-3" /></a></dd></div>
          </dl>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">
            {track.license_name === "Public domain" || track.license_name === "CC0"
              ? "No rights reserved: you may copy, share, and reuse this recording for any purpose."
              : "You may copy, share, and adapt this recording, including commercially, as long as you give the credit above" + (track.license_name.includes("SA") ? " and share adaptations under the same licence." : ".")}
          </p>
        </aside>
      </article>

      {more.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="display text-4xl">More {composer?.short ?? track.composer_name}</h2>
            <Link href={`/composers/${track.composer_slug}`} className="text-sm font-semibold text-accent">See all →</Link>
          </div>
          <div className="mt-6"><TrackList tracks={more} showComposer={false} /></div>
        </section>
      )}
    </div>
  );
}
