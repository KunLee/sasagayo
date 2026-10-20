import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-muted sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div>
          <p className="font-serif text-2xl font-semibold italic text-ink">Sasagayo</p>
          <p className="mt-3 max-w-sm leading-6">{t.footer.blurb}</p>
        </div>
        <div className="grid content-start gap-2">
          <p className="eyebrow">{t.footer.explore}</p>
          <Link href="/composers" className="hover:text-ink">{t.nav.composers}</Link>
          <Link href="/search" className="hover:text-ink">{t.nav.search}</Link>
          <Link href="/library" className="hover:text-ink">{t.nav.library}</Link>
        </div>
        <div className="grid content-start gap-2">
          <p className="eyebrow">{t.footer.sources}</p>
          <a href="https://commons.wikimedia.org/wiki/Category:Audio_files_of_classical_music" target="_blank" rel="noreferrer" className="hover:text-ink">Wikimedia Commons</a>
          <a href="https://musopen.org" target="_blank" rel="noreferrer" className="hover:text-ink">Musopen</a>
          <Link href="/about" className="hover:text-ink">{t.footer.licences}</Link>
        </div>
      </div>
    </footer>
  );
}
