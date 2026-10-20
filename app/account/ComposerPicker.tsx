"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { COMPOSER_BY_SLUG, COMPOSERS, fold } from "@/lib/composers";
import { composerLabel } from "@/lib/i18n";

/** Choose up to five favourite composers, in order. */
export default function ComposerPicker({ value, onChange }: { value: string[]; onChange: (slugs: string[]) => void }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const needle = fold(query.trim());
  const matches = COMPOSERS
    .filter((composer) => !value.includes(composer.slug))
    .filter((composer) => !needle || [composer.name, composer.short, composer.zh].some((name) => fold(name).includes(needle)))
    .slice(0, needle ? 12 : 8);
  const full = value.length >= 5;

  return (
    <div className="grid gap-2">
      <span className="text-xs font-semibold text-ink-2">{t.editProfile.favourites}</span>
      <ol className="flex min-h-10 flex-wrap gap-2" aria-label={t.editProfile.favourites}>
        {value.map((slug, index) => (
          <li key={slug} className="inline-flex items-center gap-1 rounded-full bg-ink py-1 pl-3 pr-1 text-sm text-paper">
            <span className="text-xs opacity-60">{index + 1}</span> {composerLabel(COMPOSER_BY_SLUG.get(slug), locale, slug).name}
            <button type="button" onClick={() => onChange(value.filter((item) => item !== slug))} aria-label={`${t.library.remove(slug)}`} className="grid size-6 place-items-center rounded-full hover:bg-white/15">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        {!value.length && <li className="text-sm text-muted">{t.editProfile.favouritesHint}</li>}
      </ol>
      {!full && (
        <>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-paper px-3 focus-within:border-accent">
            <Search className="size-4 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.editProfile.searchComposers} className="flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {matches.map((composer) => (
              <button key={composer.slug} type="button" onClick={() => { onChange([...value, composer.slug]); setQuery(""); }} className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent hover:text-accent">
                + {composerLabel(composer, locale).name}
              </button>
            ))}
          </div>
        </>
      )}
      <span className="text-xs text-muted">{t.editProfile.favouritesHint}</span>
    </div>
  );
}
