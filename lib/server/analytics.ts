import { createHmac } from "node:crypto";
import { serviceFetch } from "./db.ts";

export type AnalyticsEvent = {
  type: "pageview" | "play" | "listen" | "search" | "signup" | "login";
  user_id?: string | null;
  path?: string | null;
  source?: string | null;
  lang?: "en" | "zh" | null;
  device?: "mobile" | "tablet" | "desktop" | null;
  track_id?: string | null;
  composer_slug?: string | null;
  via?: "radio" | "listen" | null;
  query?: string | null;
  results?: number | null;
  seconds?: number | null;
};

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pingdom|monitor|curl|wget|python|node-fetch|axios|go-http/i;
const SEARCH_ENGINES = /(^|\.)(google|bing|baidu|duckduckgo|yahoo|sogou|so\.com|yandex|ecosia|naver)\./i;

/** Sydney calendar day, matching the database's bucketing. */
function sydneyDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
}

/**
 * A visitor code that is stable for one day only. The IP address and browser
 * string are hashed with a secret and the date, then discarded.
 */
export function visitorCode(headers: Headers) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  const agent = headers.get("user-agent") ?? "";
  const secret = process.env.ANALYTICS_SALT ?? process.env.CRON_SECRET ?? "sasagayo";
  return createHmac("sha256", secret).update(`${sydneyDay()}|${ip}|${agent}`).digest("hex").slice(0, 20);
}

export function isBot(headers: Headers) {
  return BOT.test(headers.get("user-agent") ?? "");
}

/** Where a visit came from, in human terms; internal navigation is "internal". */
export function classifySource(referrer: string | null | undefined, headers: Headers, siteHost: string) {
  if (/MicroMessenger/i.test(headers.get("user-agent") ?? "")) return "WeChat";
  if (!referrer) return null;
  let host: string;
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { return null; }
  if (host === siteHost) return "internal";
  if (SEARCH_ENGINES.test(`.${host}`)) return "Search engines";
  if (/weixin|wechat|qq\.com/.test(host)) return "WeChat";
  if (/facebook|instagram|twitter|x\.com|t\.co|reddit|weibo|xiaohongshu|linkedin|youtube/.test(host)) return "Social media";
  return host.replace(/^www\./, "").slice(0, 80);
}

/** Records events without ever failing the request that triggered them. */
export async function track(headers: Headers, events: AnalyticsEvent | AnalyticsEvent[]) {
  if (isBot(headers)) return;
  const visitor = visitorCode(headers);
  // A bulk insert needs identical keys on every row.
  const rows = (Array.isArray(events) ? events : [events]).map((event) => ({
    type: event.type, visitor, user_id: event.user_id ?? null, path: event.path ?? null, source: event.source ?? null,
    lang: event.lang ?? null, device: event.device ?? null, track_id: event.track_id ?? null,
    composer_slug: event.composer_slug ?? null, via: event.via ?? null, query: event.query ?? null,
    results: event.results ?? null, seconds: event.seconds ?? null,
  }));
  try {
    await serviceFetch("analytics_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(4_000),
    });
  } catch (error) {
    console.error("Analytics write failed", error instanceof Error ? error.message : error);
  }
}
