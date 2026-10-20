"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import { LanguageToggle, useI18n } from "@/components/I18nProvider";
import SearchBox from "@/components/SearchBox";
import { useLibrary } from "@/lib/library-store";

export default function Header() {
  const pathname = usePathname();
  const library = useLibrary();
  const { t } = useI18n();
  const nav = [
    { href: "/", label: t.nav.listen },
    { href: "/composers", label: t.nav.composers },
    { href: "/about", label: t.nav.about },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-2" aria-label="Sasagayo">
          <span className="font-serif text-[1.65rem] font-semibold italic leading-none tracking-tight">Sasagayo</span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-gold lg:inline">{t.site.tagline}</span>
        </Link>
        <nav aria-label={t.nav.main} className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition ${isActive(item.href) ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={`ml-auto w-full max-w-xs ${pathname === "/" ? "hidden lg:block" : "hidden sm:block"}`}>
          <SearchBox />
        </div>
        <Link
          href="/library"
          aria-current={isActive("/library") ? "page" : undefined}
          aria-label={t.nav.library}
          className={`relative ml-auto flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition sm:ml-0 ${isActive("/library") ? "border-accent bg-accent text-accent-ink" : "border-line hover:border-accent hover:text-accent"}`}
        >
          <Heart className="size-4" fill={library.tracks.length ? "currentColor" : "none"} />
          <span className="hidden sm:inline">{t.nav.library}</span>
          {library.tracks.length > 0 && <span className="text-xs tabular-nums opacity-80">{library.tracks.length}</span>}
        </Link>
        <LanguageToggle />
        <AccountMenu />
      </div>
      {/* Phone navigation: a scrollable strip under the bar. */}
      <nav aria-label={`${t.nav.main} (mobile)`} className="scrollbar-none flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {[...nav, { href: "/search", label: t.nav.search }].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${isActive(item.href) ? "bg-ink text-paper" : "text-ink-2"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
