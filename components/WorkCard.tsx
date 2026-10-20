import Link from "next/link";
import type { Work } from "@/lib/catalog";
import { composerNameBySlug, dictionaries, type Locale } from "@/lib/i18n";

/** A multi-movement work: title, composer, performer, movement count and length. */
export default function WorkCard({ work, locale, showComposer = true }: { work: Work; locale: Locale; showComposer?: boolean }) {
  const t = dictionaries[locale];
  return (
    <Link href={`/works/${work.work_key}`} className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-1 hover:border-accent hover:shadow-lg">
      {showComposer && <span className="eyebrow">{composerNameBySlug(work.composer_slug, locale, work.composer_name)}</span>}
      <span className="mt-2 line-clamp-3 font-serif text-2xl leading-tight group-hover:text-accent">{work.work_title}</span>
      {work.performer && <span className="mt-2 line-clamp-1 text-xs text-muted">{work.performer}</span>}
      <span className="mt-auto pt-4 text-xs text-muted">{t.work.movements(work.movements)} · {t.time.total(work.duration_seconds)}</span>
    </Link>
  );
}
