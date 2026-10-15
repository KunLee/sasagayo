import type { Metadata } from "next";
import Link from "next/link";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import { toPlayerTrack } from "@/components/player/types";
import { getTracks } from "@/lib/catalog";
import SaveMixButton from "./SaveMixButton";

type Props = { searchParams: Promise<{ n?: string; t?: string }> };

function parse(params: { n?: string; t?: string }) {
  return {
    name: (params.n ?? "").trim().slice(0, 80) || "A classical mix",
    ids: (params.t ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 100),
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { name, ids } = parse(await searchParams);
  const description = `${ids.length} classical recordings, shared from Sasagayo. Free to listen.`;
  return { title: name, description, openGraph: { title: name, description }, robots: { index: false } };
}

export default async function MixPage({ searchParams }: Props) {
  const { name, ids } = parse(await searchParams);
  const tracks = await getTracks(ids).catch(() => []);
  const composers = [...new Set(tracks.map((track) => track.composer_name.split(" ").at(-1)))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">A shared mix</p>
      <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5rem)]">{name}</h1>
      {composers.length > 0 && <p className="mt-4 text-sm text-muted">{composers.slice(0, 6).join(", ")}{composers.length > 6 ? ` and ${composers.length - 6} more` : ""}</p>}
      {tracks.length ? (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <PlayAllButton tracks={tracks} />
            <SaveMixButton tracks={tracks.map(toPlayerTrack)} />
          </div>
          <div className="mt-2"><TrackList tracks={tracks} /></div>
        </>
      ) : (
        <p className="mt-12 text-sm text-muted">This mix is empty or its recordings are no longer available. <Link href="/" className="text-accent hover:underline">Explore the library →</Link></p>
      )}
    </div>
  );
}
