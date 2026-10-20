"use client";

import { Check, Heart } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import type { PlayerTrack } from "@/components/player/types";
import { useLibrary } from "@/lib/library-store";

export default function SaveMixButton({ tracks }: { tracks: PlayerTrack[] }) {
  const library = useLibrary();
  const { t } = useI18n();
  const allSaved = tracks.every((track) => library.has(track.id));
  return (
    <button
      type="button"
      onClick={() => library.addMany(tracks)}
      disabled={allSaved}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold transition hover:border-accent hover:text-accent disabled:border-accent disabled:text-accent"
    >
      {allSaved ? <Check className="size-4" /> : <Heart className="size-4" />}
      {allSaved ? t.mix.inLibrary : t.mix.saveAll}
    </button>
  );
}
