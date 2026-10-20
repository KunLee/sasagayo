import Link from "next/link";
import type { Composer } from "@/lib/composers";
import { composerLabel, dictionaries, type Locale } from "@/lib/i18n";

export default function ComposerCard({ composer, portrait, tracks, locale = "en" }: { composer: Composer; portrait: string | null; tracks?: number; locale?: Locale }) {
  const label = composerLabel(composer, locale);
  return (
    <Link href={`/composers/${composer.slug}`} className="group flex flex-col items-center text-center">
      <span className="relative block aspect-square w-full max-w-36 overflow-hidden rounded-full border border-line bg-paper-2 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.5)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_50px_-26px_rgb(0_0_0/0.55)]">
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element -- Wikimedia thumbnails are already sized.
          <img src={portrait} alt="" loading="lazy" className="size-full object-cover object-top grayscale-[35%] sepia-[15%] transition duration-500 group-hover:grayscale-0 group-hover:sepia-0" />
        ) : (
          <span className="grid size-full place-items-center font-serif text-4xl italic text-muted">{composer.short.slice(0, 1)}</span>
        )}
      </span>
      <span className="mt-3 font-serif text-xl leading-tight group-hover:text-accent">{label.short}</span>
      <span className="mt-0.5 text-[11px] text-muted">
        {composer.born}–{composer.died}{tracks ? ` · ${dictionaries[locale].composers.recordings(tracks)}` : ""}
      </span>
    </Link>
  );
}
