import { after, NextRequest } from "next/server";
import { classifySource, track, type AnalyticsEvent } from "@/lib/server/analytics";
import { authenticateRequest } from "@/lib/server/supabase-session";

const UUID = /^[0-9a-f-]{36}$/i;

type Payload = {
  type?: string;
  path?: string;
  referrer?: string;
  lang?: string;
  device?: string;
  trackId?: string;
  composer?: string;
  via?: string;
  seconds?: number;
};

/**
 * Page views and listening time from the browser, sent with sendBeacon.
 * Always answers 204 quickly; the write happens after the response.
 */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as Payload | null;
  if (!payload || (payload.type !== "pageview" && payload.type !== "listen")) return new Response(null, { status: 204 });

  const event: AnalyticsEvent = {
    type: payload.type,
    lang: payload.lang === "zh" ? "zh" : payload.lang === "en" ? "en" : null,
    device: payload.device === "mobile" || payload.device === "tablet" || payload.device === "desktop" ? payload.device : null,
  };
  if (payload.type === "pageview") {
    const path = typeof payload.path === "string" ? payload.path.split("?")[0].slice(0, 200) : "/";
    if (path.startsWith("/admin") || path.startsWith("/api")) return new Response(null, { status: 204 });
    event.path = path;
    event.source = classifySource(payload.referrer, request.headers, request.nextUrl.hostname);
  } else {
    if (!payload.trackId || !UUID.test(payload.trackId)) return new Response(null, { status: 204 });
    event.track_id = payload.trackId;
    event.composer_slug = typeof payload.composer === "string" ? payload.composer.slice(0, 40) : null;
    event.via = payload.via === "radio" ? "radio" : "listen";
    event.seconds = Math.max(0, Math.min(7200, Math.round(Number(payload.seconds) || 0)));
    if (event.seconds < 5) return new Response(null, { status: 204 });
  }

  after(async () => {
    const auth = request.cookies.has("sasagayo-access-token") ? await authenticateRequest(request).catch(() => null) : null;
    await track(request.headers, { ...event, user_id: auth?.user.id ?? null });
  });
  return new Response(null, { status: 204 });
}
