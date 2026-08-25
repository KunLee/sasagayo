"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpenText, Compass, LoaderCircle, Users } from "lucide-react";

const destinations: Record<
  string,
  { label: string; note: string; icon: typeof Compass }
> = {
  "/discover": {
    label: "Opening Discover",
    note: "Finding a thoughtful way into the music…",
    icon: Compass,
  },
  "/stories": {
    label: "Opening the story journal",
    note: "Gathering memories and the music they carry…",
    icon: BookOpenText,
  },
  "/circles": {
    label: "Opening listening circles",
    note: "Finding people on your frequency…",
    icon: Users,
  },
};

export default function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [destination, setDestination] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [slow, setSlow] = useState(false);
  const currentPath = useRef(pathname);
  const navigationStartedAt = useRef<number | null>(null);
  useEffect(() => {
    currentPath.current = pathname;
    const timer = window.setTimeout(() => {
      if (navigationStartedAt.current != null) {
        const duration = performance.now() - navigationStartedAt.current;
        performance.measure("sasagayo-route-navigation", {
          start: navigationStartedAt.current,
          duration,
          detail: { pathname },
        });
        navigationStartedAt.current = null;
      }
      setActive(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    if (!active) return;
    const revealTimer = window.setTimeout(() => setOverlayVisible(true), 160);
    const expandTimer = window.setTimeout(() => setExpanded(true), 650);
    const slowTimer = window.setTimeout(() => setSlow(true), 4_000);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(expandTimer);
      window.clearTimeout(slowTimer);
    };
  }, [active]);
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === currentPath.current
      )
        return;
      navigationStartedAt.current = performance.now();
      setOverlayVisible(false);
      setExpanded(false);
      setSlow(false);
      setDestination(destination.pathname);
      setActive(true);
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, []);
  const context = destinations[destination] ?? {
    label: "Opening the next page",
    note: "Carrying your place with us…",
    icon: LoaderCircle,
  };
  const Icon = context.icon;
  return (
    <>
      <div
        className={`route-progress ${active ? "is-active" : ""}`}
        aria-hidden="true"
      >
        <span />
      </div>
      {active && overlayVisible && (
        <div
          className={`route-transition ${expanded ? "is-expanded" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="route-transition__card">
            <div className="route-transition__summary">
            <div className="route-transition__icon" aria-hidden="true">
              <Icon className="size-5" />
              <span />
            </div>
            <div>
              <p className="route-transition__label">{context.label}</p>
              <p className="route-transition__note">
                {slow
                  ? "This is taking longer than usual. Your place is still safe."
                  : context.note}
              </p>
            </div>
            {slow ? (
              <button
                type="button"
                onClick={() => window.location.assign(destination)}
                className="route-transition__fallback"
              >
                Open directly
              </button>
            ) : (
              <LoaderCircle
                className="ml-auto size-4 shrink-0 animate-spin"
                aria-hidden="true"
              />
            )}
            </div>
            {expanded && (
              <div className="route-transition__preview" aria-hidden="true">
                <span className="route-transition__preview-label" />
                <span className="route-transition__preview-title" />
                <span className="route-transition__preview-copy" />
                <div>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
