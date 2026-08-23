"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Compass, Menu, PenLine, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import SearchPalette from "@/components/SearchPalette";
import AdminNavLink from "@/components/AdminNavLink";
const navigation = [
  { label: "Discover", href: "/discover", match: "/discover" },
  { label: "Stories", href: "/stories", match: "/stories" },
  { label: "Circles", href: "/circles", match: "/circles" },
] as const;
export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const found = navigation.findIndex((item) => pathname.startsWith(item.match));
  // Seed the indicator's position from `found` right in the lazy initializer
  // (rather than defaulting to 0 and correcting it later in an effect) so the
  // very first render already lands in the right slot. Once mounted, only
  // move the indicator when the route actually matches one of the three
  // tabs — never snap it back to "Discover" just because the current page
  // isn't one of the tracked tabs. Without this, the pill could be parked at
  // slot 0 while hidden, then pop into view mid-slide the first time a
  // visitor moved from an untracked page onto a tab, reading as a layout
  // glitch on load.
  const [activeIndex, setActiveIndex] = useState(() => Math.max(found, 0));
  useEffect(() => {
    if (found >= 0) setActiveIndex(found);
  }, [found]);
  return (
    <header className="sticky top-0 z-50 border-b border-stone-900/8 bg-[#f7f4ee]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Sasagayo home"
        >
          <span className="grid size-8 place-items-center rounded-full bg-[#2b2025] font-serif text-lg italic text-white">
            S
          </span>
          <span className="font-serif text-[22px] tracking-[-.03em]">
            sasagayo
          </span>
        </Link>
        <nav className="nav-slider hidden lg:grid" aria-label="Main navigation">
          <span
            className="nav-slider__indicator"
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
              opacity: found < 0 ? 0 : 1,
            }}
            aria-hidden="true"
          />
          {navigation.map((item, index) => (
            <Link
              key={item.href}
              className={`nav-slider__item ${activeIndex === index && found >= 0 ? "is-active" : ""}`}
              href={item.href}
            >
              {index === 0 && <Compass className="size-3.5" />}
              {item.label}
            </Link>
          ))}
        </nav>
        <SearchPalette />
        <div className="flex items-center gap-2">
          <AdminNavLink />
          <Link
            href="/activity"
            className="icon-button hidden sm:grid"
            aria-label="Activity"
          >
            <Bell className="size-4" />
          </Link>
          <Link
            href="/compose"
            className="hidden h-10 items-center gap-2 rounded-full bg-[#a74735] px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#923a2b] sm:flex"
          >
            <PenLine className="size-4" />
            Share
          </Link>
          <Link href="/account" aria-label="Your account">
            <Avatar className="ring-2 ring-white" size="default">
              <AvatarFallback className="bg-[#d8b36e] text-[10px] font-bold text-[#342824]">
                YO
              </AvatarFallback>
              <AvatarBadge className="bg-emerald-500" />
            </Avatar>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="icon-button grid lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav
          className="border-t border-stone-900/8 bg-[#f7f4ee] px-5 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto grid max-w-[1400px] gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/compose"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-xl bg-[#a74735] px-4 py-3 text-sm font-semibold text-white"
            >
              Share a story
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
