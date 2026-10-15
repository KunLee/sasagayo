import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery/run";
import { queryTokens } from "@/lib/search-tokens";
import { dbConfig, inList, serviceFetch, serviceJson } from "@/lib/server/db";
import { authenticateRequest, setSessionCookies } from "@/lib/server/supabase-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ADMIN_FIELDS = "id,title,composer_slug,composer_name,performer,duration_seconds,stream_url,source_page_url,license_name,quality_score,quality_notes,status,discovered_at,play_count";
const STATUSES = ["published", "review", "rejected", "hidden"] as const;

async function requireAdmin(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  const { url, publishableKey } = dbConfig();
  const check = await fetch(`${url}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { apikey: publishableKey, Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  const isAdmin = check.ok && (await check.json()) === true;
  if (!isAdmin) return { error: NextResponse.json({ error: "This account is not an administrator." }, { status: 403 }) };
  return { auth };
}

function reply(body: unknown, refreshed: Parameters<typeof setSessionCookies>[1] | null, status = 200) {
  const response = NextResponse.json(body, { status });
  if (refreshed) setSessionCookies(response, refreshed);
  return response;
}

async function countByStatus() {
  const entries = await Promise.all(STATUSES.map(async (status) => {
    const response = await serviceFetch(`tracks?select=id&status=eq.${status}&limit=1`, { headers: { Prefer: "count=exact" } });
    return [status, Number(response.headers.get("content-range")?.split("/")[1] ?? 0)] as const;
  }));
  return Object.fromEntries(entries);
}

export async function GET(request: NextRequest) {
  const checked = await requireAdmin(request);
  if ("error" in checked) return checked.error;
  const refreshed = checked.auth.refreshedSession;
  try {
    const params = request.nextUrl.searchParams;
    const status = STATUSES.find((value) => value === params.get("status")) ?? "review";
    const tokens = queryTokens(params.get("q") ?? "");
    const filters = [`status=eq.${status}`];
    if (tokens.length) filters.push(`and=(${tokens.map((token) => `search_text.ilike.*${token}*`).join(",")})`);
    const order = status === "review" ? "quality_score.desc,discovered_at.desc" : "discovered_at.desc";
    const [counts, tracks, runs, feeds] = await Promise.all([
      countByStatus(),
      serviceJson(`tracks?select=${ADMIN_FIELDS}&${filters.join("&")}&order=${order}&limit=60`),
      serviceJson("discovery_runs?select=*&order=started_at.desc&limit=12"),
      serviceJson<{ feed: string; total_hits: number | null; next_offset: number; last_crawled_at: string | null }[]>("discovery_state?select=*"),
    ]);
    const crawled = feeds.filter((feed) => feed.last_crawled_at).length;
    return reply({ counts, tracks, runs, feeds: { crawled, known: feeds.length } }, refreshed);
  } catch (error) {
    console.error("Admin read failed", error);
    return reply({ error: error instanceof Error ? error.message : "Admin data unavailable." }, refreshed, 502);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const checked = await requireAdmin(request);
  if ("error" in checked) return checked.error;
  const refreshed = checked.auth.refreshedSession;
  try {
    const body = (await request.json()) as { action?: string; ids?: string[]; status?: string };
    if (body.action === "set-status") {
      const status = STATUSES.find((value) => value === body.status);
      const ids = (body.ids ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
      if (!status || !ids.length) return reply({ error: "Choose tracks and a status." }, refreshed, 400);
      await serviceJson(`tracks?id=in.${encodeURIComponent(inList(ids))}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString(),
          ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
        }),
      });
      revalidateTag("tracks", "max");
      return reply({ ok: true }, refreshed);
    }
    if (body.action === "run-discovery") {
      const summary = await runDiscovery({ trigger: "admin", budgetMs: 90_000 });
      revalidateTag("tracks", "max");
      return reply({ ok: true, summary }, refreshed);
    }
    return reply({ error: "Unknown action." }, refreshed, 400);
  } catch (error) {
    console.error("Admin action failed", error);
    return reply({ error: error instanceof Error ? error.message : "Action failed." }, refreshed, 502);
  }
}
