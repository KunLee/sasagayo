import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-muted sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div>
          <p className="font-serif text-2xl font-semibold italic text-ink">Sasagayo</p>
          <p className="mt-3 max-w-sm leading-6">
            Great classical recordings that anyone may hear, keep, and share — gathered every day from public archives,
            each one credited and licensed.
          </p>
        </div>
        <div className="grid content-start gap-2">
          <p className="eyebrow">Explore</p>
          <Link href="/composers" className="hover:text-ink">Composers</Link>
          <Link href="/search" className="hover:text-ink">Search</Link>
          <Link href="/library" className="hover:text-ink">My library</Link>
        </div>
        <div className="grid content-start gap-2">
          <p className="eyebrow">Sources</p>
          <a href="https://commons.wikimedia.org/wiki/Category:Audio_files_of_classical_music" target="_blank" rel="noreferrer" className="hover:text-ink">Wikimedia Commons</a>
          <a href="https://musopen.org" target="_blank" rel="noreferrer" className="hover:text-ink">Musopen</a>
          <Link href="/about" className="hover:text-ink">Licences & contact</Link>
        </div>
      </div>
    </footer>
  );
}
