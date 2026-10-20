"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Heart, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import ShareButton from "@/components/ShareButton";
import { PlayAllButton } from "@/components/TrackList";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useSession } from "@/components/SessionProvider";
import { formatDuration } from "@/lib/format";
import { composerNameBySlug } from "@/lib/i18n";
import { useLibrary } from "@/lib/library-store";

export default function LibraryClient() {
  const library = useLibrary();
  const player = usePlayer();
  const session = useSession();
  const { t, locale } = useI18n();
  const [name, setName] = useState(t.library.defaultMixName);
  const tracks = library.tracks;
  const mixPath = `/mix?n=${encodeURIComponent(name.trim() || t.mix.defaultName)}&t=${tracks.slice(0, 60).map((track) => track.id).join(",")}`;
  const link = "font-semibold text-accent";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">{t.library.eyebrow}</p>
      <h1 className="display mt-4 text-[clamp(2.75rem,7vw,5rem)]">{t.library.heading}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{t.library.intro}</p>
      {session.account ? (
        <p className="mt-3 text-xs text-muted">
          {library.sync === "saving" ? t.library.saving : library.sync === "error" ? t.library.syncError : t.library.synced(session.account.email)}
        </p>
      ) : !session.loading && (
        <p className="mt-4 max-w-2xl rounded-2xl border border-line bg-card px-4 py-3 text-sm">
          {t.library.browserOnly} <Link href="/signup?next=/library" className={link}>{t.library.createAccount}</Link> {t.library.or}{" "}
          <Link href="/signin?next=/library" className={link}>{t.library.signIn}</Link>{locale === "zh" ? "" : " "}{t.library.keepEverywhere}
        </p>
      )}

      {tracks.length === 0 ? (
        <div className="mt-14 rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <Heart className="mx-auto size-8 text-accent" />
          <p className="display mt-5 text-3xl">{t.library.emptyTitle}</p>
          <p className="mt-3 text-sm text-muted">
            {t.library.emptyStart} <Link href="/" className="text-accent underline-offset-4 hover:underline">{t.library.emptyProgramme}</Link>{" "}
            {t.library.emptyOr} <Link href="/composers" className="text-accent underline-offset-4 hover:underline">{t.library.emptyComposers}</Link>{locale === "zh" ? "。" : "."}
          </p>
        </div>
      ) : (
        <>
          <section className="mt-10 grid gap-4 rounded-3xl border border-line bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t.library.shareAsMix}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 80))}
                className="h-12 rounded-xl border border-line bg-paper px-4 font-serif text-xl outline-none focus:border-accent"
                aria-label={t.library.mixName}
              />
            </label>
            <ShareButton
              path={mixPath}
              title={name}
              text={t.library.mixText(tracks.length)}
              label={t.library.shareMix}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-accent"
            />
            {tracks.length > 60 && <p className="text-xs text-muted sm:col-span-2">{t.library.mixLimit}</p>}
          </section>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <PlayAllButton tracks={tracks} />
            <button type="button" onClick={() => window.confirm(t.library.clearConfirm) && library.clear()} className="text-xs text-muted hover:text-accent">
              {t.library.clear}
            </button>
          </div>
          <ol className="divide-y divide-line border-b border-line">
            {tracks.map((track, position) => (
              <li key={track.id} className={`flex items-center gap-3 py-3 ${player.current?.id === track.id ? "text-accent" : ""}`}>
                <button type="button" onClick={() => player.playAll(tracks, position)} className="w-8 shrink-0 text-right text-xs tabular-nums text-muted hover:text-accent" aria-label={t.list.play(track.title)}>
                  {position + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <Link href={`/track/${track.id}`} className="block truncate font-serif text-lg leading-snug hover:underline">{track.title}</Link>
                  <p className="truncate text-xs text-muted">{composerNameBySlug(track.composer_slug, locale, track.composer_name)}{track.performer ? ` · ${track.performer}` : ""} · {formatDuration(track.duration_seconds)}</p>
                </div>
                <div className="flex shrink-0 items-center text-muted">
                  <button type="button" onClick={() => library.move(track.id, -1)} disabled={position === 0} aria-label={t.library.moveUp} className="grid size-8 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-25"><ArrowUp className="size-4" /></button>
                  <button type="button" onClick={() => library.move(track.id, 1)} disabled={position === tracks.length - 1} aria-label={t.library.moveDown} className="grid size-8 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-25"><ArrowDown className="size-4" /></button>
                  <button type="button" onClick={() => library.remove(track.id)} aria-label={t.library.remove(track.title)} className="grid size-8 place-items-center rounded-full hover:bg-paper-2 hover:text-accent"><X className="size-4" /></button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
