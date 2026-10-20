import type { Metadata } from "next";
import Link from "next/link";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { toPlayerTrack } from "@/components/player/types";
import { getTracks } from "@/lib/catalog";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { composerLabel } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import SaveMixButton from "./SaveMixButton";

type Props = { searchParams: Promise<{ n?: string; t?: string }> };

function parse(params: { n?: string; t?: string }, fallback: string) {
  return {
    name: (params.n ?? "").trim().slice(0, 80) || fallback,
    ids: (params.t ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 100),
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { t } = await getI18n();
  const { name, ids } = parse(await searchParams, t.mix.defaultName);
  const description = t.mix.description(ids.length);
  return { title: name, description, openGraph: { title: name, description }, robots: { index: false } };
}

export default async function MixPage({ searchParams }: Props) {
  const { t, locale } = await getI18n();
  const { name, ids } = parse(await searchParams, t.mix.defaultName);
  const tracks = await getTracks(ids).catch(() => []);
  const composers = [...new Set(tracks.map((track) => composerLabel(COMPOSER_BY_SLUG.get(track.composer_slug), locale, track.composer_name).short))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">{t.mix.eyebrow}</p>
      <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5rem)]">{name}</h1>
      {composers.length > 0 && (
        <p className="mt-4 text-sm text-muted">{composers.slice(0, 6).join(locale === "zh" ? "、" : ", ")}{composers.length > 6 ? t.mix.andMore(composers.length - 6) : ""}</p>
      )}
      {tracks.length ? (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <PlayAllButton tracks={tracks} />
            <SaveMixButton tracks={tracks.map(toPlayerTrack)} />
          </div>
          <div className="mt-2"><TrackList tracks={tracks} /></div>
        </>
      ) : (
        <p className="mt-12 text-sm text-muted">{t.mix.empty} <Link href="/" className="text-accent hover:underline">{t.mix.explore}</Link></p>
      )}
    </div>
  );
}
