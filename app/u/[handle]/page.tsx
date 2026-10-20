import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ComposerCard from "@/components/ComposerCard";
import ShareButton from "@/components/ShareButton";
import TrackList, { PlayAllButton } from "@/components/TrackList";
import type { PlayerTrack } from "@/components/player/types";
import { composerPortraits } from "@/lib/composer-info";
import { COMPOSER_BY_SLUG, type Composer } from "@/lib/composers";
import { getI18n } from "@/lib/i18n/server";
import { publicRpc } from "@/lib/server/db";
import ProfileActions from "./ProfileActions";

type PublicProfile = {
  id: string;
  handle: string;
  displayName: string;
  motto: string;
  bio: string;
  avatarUrl: string | null;
  favoriteComposers: string[];
  joined: string;
  isEditor: boolean;
  libraryPublic: boolean;
  librarySize: number;
  library: PlayerTrack[];
};

type Props = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  if (!/^[a-z0-9_]{3,30}$/i.test(handle)) return null;
  // Not cached: owners expect their edits to show immediately.
  return publicRpc<PublicProfile | null>("public_profile", { p_handle: handle.toLowerCase() }, { revalidate: 0 }).catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await load((await params).handle);
  if (!profile) return { robots: { index: false } };
  return {
    title: `${profile.displayName} (@${profile.handle})`,
    description: profile.motto || profile.bio.slice(0, 160) || undefined,
    // Listener pages are shareable but kept out of search engines.
    robots: { index: false, follow: false },
    openGraph: { title: profile.displayName, description: profile.motto || undefined, images: profile.avatarUrl ? [profile.avatarUrl] : undefined },
  };
}

export default async function ProfilePage({ params }: Props) {
  const profile = await load((await params).handle);
  if (!profile) notFound();
  const { t, locale } = await getI18n();
  const favourites = profile.favoriteComposers.map((slug) => COMPOSER_BY_SLUG.get(slug)).filter((composer): composer is Composer => Boolean(composer));
  const portraits = await composerPortraits(favourites);
  const joined = new Intl.DateTimeFormat(t.dateLocale, { month: "long", year: "numeric" }).format(new Date(profile.joined));

  return (
    <div>
      <section className="paper-grain border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-14 text-center sm:flex-row sm:items-end sm:px-6 sm:text-left">
          <Avatar name={profile.displayName} url={profile.avatarUrl} size={144} className="shadow-xl ring-4 ring-card" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">
              @{profile.handle}
              {profile.isEditor && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-ink">{t.profile.editor}</span>}
            </p>
            <h1 className="display mt-2 text-[clamp(2.75rem,7vw,4.5rem)]">{profile.displayName}</h1>
            {profile.motto && <p className="mt-3 font-serif text-2xl italic text-ink-2">“{profile.motto}”</p>}
            <p className="mt-3 text-xs text-muted">{t.profile.joined(joined)}</p>
          </div>
          <ProfileActions handle={profile.handle} ownerId={profile.id} displayName={profile.displayName} />
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-16 px-4 py-12 sm:px-6">
        {profile.bio && <p className="max-w-2xl whitespace-pre-line text-base leading-8 text-ink-2">{profile.bio}</p>}

        {favourites.length > 0 && (
          <section>
            <h2 className="display text-4xl">{t.profile.favourites}</h2>
            <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-5">
              {favourites.map((composer) => (
                <ComposerCard key={composer.slug} composer={composer} portrait={portraits.get(composer.slug) ?? null} locale={locale} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <h2 className="display text-4xl">{t.profile.library}</h2>
            {profile.libraryPublic && profile.library.length > 0 && <PlayAllButton tracks={profile.library} label={t.profile.playLibrary} />}
          </div>
          {profile.libraryPublic ? (
            <div className="mt-2"><TrackList tracks={profile.library} emptyMessage={t.profile.libraryEmpty} /></div>
          ) : (
            <p className="mt-6 text-sm text-muted">{profile.librarySize ? t.profile.libraryPrivate(profile.librarySize) : t.profile.libraryEmpty}</p>
          )}
        </section>

        {/* A div, not a p: the share sheet contains block elements. */}
        <div className="text-center text-sm">
          <ShareButton path={`/u/${profile.handle}`} title={t.profile.shareText(profile.displayName)} label={t.profile.share} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 font-semibold transition hover:border-accent hover:text-accent" />
        </div>
        <p className="text-center text-xs text-muted"><Link href="/" className="hover:text-accent">Sasagayo</Link></p>
      </div>
    </div>
  );
}
