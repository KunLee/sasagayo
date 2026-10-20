"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";
import { useSession } from "@/components/SessionProvider";

/** Respect Do Not Track / Global Privacy Control, and leave editors' own browsing out. */
export function analyticsAllowed(isEditor: boolean) {
  if (typeof navigator === "undefined" || isEditor) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !(nav.globalPrivacyControl || nav.doNotTrack === "1");
}

export function deviceClass() {
  const width = Math.min(window.screen.width, window.innerWidth);
  return width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

export function beacon(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.("/api/collect", new Blob([body], { type: "application/json" }))) return;
  void fetch("/api/collect", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
}

/** One page view per client-side navigation; the first carries the external referrer. */
export default function Analytics() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const session = useSession();
  const first = useRef(true);
  const last = useRef<string | null>(null);

  useEffect(() => {
    // Wait for the session so an editor's first page view is not counted.
    if (session.loading || last.current === pathname) return;
    last.current = pathname;
    const referrer = first.current ? document.referrer : window.location.origin;
    first.current = false;
    if (!analyticsAllowed(session.isEditor)) return;
    beacon({ type: "pageview", path: pathname, referrer, lang: locale, device: deviceClass() });
  }, [pathname, locale, session.loading, session.isEditor]);

  return null;
}
