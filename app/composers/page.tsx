import type { Metadata } from "next";
import ComposerCard from "@/components/ComposerCard";
import { composerCounts } from "@/lib/catalog";
import { composerPortraits } from "@/lib/composer-info";
import { COMPOSERS, ERAS, eraAnchor } from "@/lib/composers";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.composers.title, description: t.composers.metaDescription, alternates: { canonical: "/composers" } };
}

export default async function ComposersPage() {
  const { t, locale } = await getI18n();
  const [counts, portraits] = await Promise.all([
    composerCounts().catch(() => new Map<string, { tracks: number; seconds: number }>()),
    composerPortraits(COMPOSERS),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow">{t.composers.eyebrow}</p>
      <h1 className="display mt-4 text-[clamp(3rem,7vw,5.5rem)]">{t.composers.heading}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-ink-2">{t.composers.intro(COMPOSERS.length)}</p>
      <nav aria-label={t.composers.eras} className="scrollbar-none mt-8 flex gap-2 overflow-x-auto">
        {ERAS.map((era) => (
          <a key={era.name} href={`#${eraAnchor(era.name)}`} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent">
            {t.eras[era.name].name}
          </a>
        ))}
      </nav>
      {ERAS.map((era) => {
        const members = COMPOSERS.filter((composer) => composer.era === era.name).sort((a, b) => a.born - b.born);
        const label = t.eras[era.name];
        return (
          <section key={era.name} id={eraAnchor(era.name)} className="scroll-mt-28 pt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
              <h2 className="display text-4xl">{label.name}</h2>
              <p className="text-sm text-muted">{label.span} · {label.blurb}</p>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
              {members.map((composer) => (
                <ComposerCard key={composer.slug} composer={composer} portrait={portraits.get(composer.slug) ?? null} tracks={counts.get(composer.slug)?.tracks} locale={locale} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
