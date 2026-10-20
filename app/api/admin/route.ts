import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { applyPolicyToQueue, loadPolicy, savePolicy } from "@/lib/discovery/policy";
import { buildSearchText, dedupeKey, workFields, type PublishPolicy } from "@/lib/discovery/quality";
import { runDiscovery } from "@/lib/discovery/run";
import { queryTokens } from "@/lib/search-tokens";
import { currentAccount, reply, rpcAsUser } from "@/lib/server/as-user";
import { dbConfig, inList, serviceFetch, serviceJson } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TRACK_FIELDS = "id,title,composer_slug,composer_name,performer,duration_seconds,stream_url,source_page_url,license_name,quality_score,quality_notes,status,discovered_at,reviewed_at,play_count";
const STATUSES = ["published", "review", "rejected", "hidden"] as const;
type Status = (typeof STATUSES)[number];
const PAGE_SIZE = 50;

async function requireEditor(request: NextRequest) {
  const session = await currentAccount(request);
  if (!session) return { error: reply({ error: "Please sign in." }, null, 401) };
  if (session.account.role !== "admin") return { error: reply({ error: "This account is not an editor." }, session.refreshedSession, 403) };
  return { session };
}

async function count(filter: string) {
  const response = await serviceFetch(`tracks?select=id&${filter}&limit=1`, { headers: { Prefer: "count=exact" } });
  return Number(response.headers.get("content-range")?.split("/")[1] ?? 0);
}

async function overview() {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [totals, incoming, runs, feeds, policy] = await Promise.all([
    Promise.all(STATUSES.map(async (status) => [status, await count(`status=eq.${status}`)] as const)),
    Promise.all(STATUSES.map(async (status) => [status, await count(`status=eq.${status}&discovered_at=gte.${since}`)] as const)),
    serviceJson("discovery_runs?select=*&order=started_at.desc&limit=14"),
    serviceJson<{ last_crawled_at: string | null }[]>("discovery_state?select=last_crawled_at"),
    loadPolicy(),
  ]);
  return {
    totals: Object.fromEntries(totals),
    incoming: Object.fromEntries(incoming),
    runs,
    feeds: { crawled: feeds.filter((feed) => feed.last_crawled_at).length, known: feeds.length },
    policy,
  };
}

async function listTracks(params: URLSearchParams) {
  const filters: string[] = [];
  const status = params.get("status");
  if (STATUSES.includes(status as Status)) filters.push(`status=eq.${status}`);
  const since = { "24h": 86_400_000, "7d": 7 * 86_400_000 }[params.get("since") ?? ""];
  if (since) filters.push(`discovered_at=gte.${new Date(Date.now() - since).toISOString()}`);
  const composer = params.get("composer");
  if (composer && COMPOSER_BY_SLUG.has(composer)) filters.push(`composer_slug=eq.${composer}`);
  const minScore = Number(params.get("minScore"));
  if (minScore > 0) filters.push(`quality_score=gte.${Math.min(100, minScore)}`);
  const tokens = queryTokens(params.get("q") ?? "");
  if (tokens.length) filters.push(`and=(${tokens.map((token) => `search_text.ilike.*${token}*`).join(",")})`);
  const order = params.get("sort") === "newest" ? "discovered_at.desc,id" : "quality_score.desc,discovered_at.desc,id";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const response = await serviceFetch(
    `tracks?select=${TRACK_FIELDS}${filters.length ? `&${filters.join("&")}` : ""}&order=${order}&limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
    { headers: { Prefer: "count=exact" } },
  );
  return {
    tracks: await response.json(),
    total: Number(response.headers.get("content-range")?.split("/")[1] ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function GET(request: NextRequest) {
  const checked = await requireEditor(request);
  if ("error" in checked) return checked.error;
  const { session } = checked;
  const params = request.nextUrl.searchParams;
  try {
    const view = params.get("view") ?? "overview";
    if (view === "overview") return reply(await overview(), session.refreshedSession);
    if (view === "tracks") return reply(await listTracks(params), session.refreshedSession);
    if (view === "reports") {
      const reports = await rpcAsUser(session.accessToken, "admin_profile_reports");
      return reply({ reports }, session.refreshedSession);
    }
    if (view === "stats") {
      const days = [7, 30, 90].includes(Number(params.get("days"))) ? Number(params.get("days")) : 30;
      const stats = await serviceJson("rpc/analytics_summary", { method: "POST", body: JSON.stringify({ p_days: days }) });
      return reply(stats, session.refreshedSession);
    }
    if (view === "users") {
      const users = await rpcAsUser(session.accessToken, "admin_list_users", { p_search: (params.get("q") ?? "").slice(0, 80), p_limit: 200 });
      return reply({ users, me: session.account.id }, session.refreshedSession);
    }
    return reply({ error: "Unknown view." }, session.refreshedSession, 400);
  } catch (error) {
    console.error("Editor read failed", error);
    return reply({ error: error instanceof Error ? error.message : "Editor data unavailable." }, session.refreshedSession, 502);
  }
}

type Body = {
  action?: string;
  id?: string;
  title?: string;
  performer?: string;
  composerSlug?: string;
  ids?: string[];
  status?: string;
  policy?: Partial<PublishPolicy>;
  applyToQueue?: boolean;
  userId?: string;
  reportId?: string;
  moderation?: string;
  role?: string;
  reason?: string;
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const checked = await requireEditor(request);
  if ("error" in checked) return checked.error;
  const { session } = checked;
  const editorId = session.account.id;
  const done = (body: unknown) => reply(body, session.refreshedSession);
  const fail = (message: string, status = 400) => reply({ error: message }, session.refreshedSession, status);

  try {
    const body = (await request.json()) as Body;
    switch (body.action) {
      case "set-status": {
        const status = STATUSES.find((value) => value === body.status);
        const ids = (body.ids ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
        if (!status || !ids.length) return fail("Choose recordings and a decision.");
        const now = new Date().toISOString();
        await serviceJson(`tracks?id=in.${encodeURIComponent(inList(ids))}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status, reviewed_by: editorId, reviewed_at: now, updated_at: now, ...(status === "published" ? { published_at: now } : {}) }),
        });
        revalidateTag("tracks", "max");
        return done({ ok: true, updated: ids.length });
      }
      case "edit-track": {
        if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return fail("Choose a recording.");
        const title = (body.title ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
        const performer = (body.performer ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
        const composer = COMPOSER_BY_SLUG.get(body.composerSlug ?? "");
        if (!title) return fail("A title is required.");
        if (!composer) return fail("Choose a composer.");
        const [current] = await serviceJson<{ performer: string | null; description: string; attribution: string }[]>(`tracks?id=eq.${body.id}&select=performer,description,attribution`);
        if (!current) return fail("Recording not found.", 404);
        // Keep the licence and source parts of the credit; only the performer part changes.
        const credit = current.attribution.replace(/^Performed by [^·]+ · /, "");
        const now = new Date().toISOString();
        await serviceJson(`tracks?id=eq.${body.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            title,
            performer,
            composer_slug: composer.slug,
            composer_name: composer.name,
            attribution: (performer ? `Performed by ${performer} · ${credit}` : credit).slice(0, 1000),
            dedupe_key: dedupeKey(composer.slug, title, performer),
            search_text: buildSearchText(title, composer, performer, current.description),
            ...workFields(composer.slug, title, performer),
            reviewed_by: editorId,
            reviewed_at: now,
            updated_at: now,
          }),
        });
        revalidateTag("tracks", "max");
        return done({ ok: true });
      }
      case "run-discovery": {
        const summary = await runDiscovery({ trigger: "editor", budgetMs: 90_000 });
        revalidateTag("tracks", "max");
        return done({ ok: true, summary });
      }
      case "save-policy": {
        const mode = body.policy?.mode === "manual" ? "manual" : "auto";
        const publishAt = Math.round(Number(body.policy?.publishAt));
        const reviewAt = Math.round(Number(body.policy?.reviewAt));
        if (!(publishAt >= 30 && publishAt <= 100 && reviewAt >= 25 && reviewAt <= publishAt)) {
          return fail("Thresholds must satisfy 25 ≤ review ≤ publish ≤ 100.");
        }
        const policy: PublishPolicy = { mode, publishAt, reviewAt };
        await savePolicy(policy, editorId);
        const applied = body.applyToQueue ? await applyPolicyToQueue(policy) : null;
        if (applied?.published) revalidateTag("tracks", "max");
        return done({ ok: true, policy, applied });
      }
      case "moderate-profile": {
        if (!body.userId || !/^[0-9a-f-]{36}$/i.test(body.userId)) return fail("Choose a user.");
        const reason = (body.reason ?? "").trim();
        if (reason.length < 5) return fail("Please give a short reason (5+ characters) for the audit log.");
        if (!["remove_avatar", "clear_text", "reset_handle"].includes(body.moderation ?? "")) return fail("Unknown moderation action.");
        const removed = await rpcAsUser<string | null>(session.accessToken, "admin_moderate_profile", { p_user_id: body.userId, p_action: body.moderation, p_reason: reason });
        const path = removed?.split("/storage/v1/object/public/avatars/")[1];
        if (path) {
          const { url, secretKey } = dbConfig();
          await fetch(`${url}/storage/v1/object/avatars/${path}`, {
            method: "DELETE",
            headers: { apikey: secretKey ?? "", ...(secretKey?.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${secretKey}` }) },
          }).catch(() => undefined);
        }
        return done({ ok: true });
      }
      case "resolve-report": {
        if (!body.reportId || !/^[0-9a-f-]{36}$/i.test(body.reportId)) return fail("Choose a report.");
        if (body.status !== "resolved" && body.status !== "dismissed") return fail("Unknown resolution.");
        await rpcAsUser(session.accessToken, "admin_resolve_report", { p_report_id: body.reportId, p_status: body.status, p_reason: (body.reason ?? "").trim() || `Report ${body.status} in the editor desk` });
        return done({ ok: true });
      }
      case "set-role":
      case "set-user-status": {
        if (!body.userId || !/^[0-9a-f-]{36}$/i.test(body.userId)) return fail("Choose a user.");
        const reason = (body.reason ?? "").trim();
        if (reason.length < 5) return fail("Please give a short reason (5+ characters) for the audit log.");
        if (body.action === "set-role") {
          if (body.role !== "admin" && body.role !== "member") return fail("Unknown role.");
          await rpcAsUser(session.accessToken, "admin_set_role", { p_user_id: body.userId, p_role: body.role, p_reason: reason });
        } else {
          if (body.status !== "active" && body.status !== "suspended") return fail("Unknown status.");
          await rpcAsUser(session.accessToken, "admin_set_account_status", { p_user_id: body.userId, p_status: body.status, p_reason: reason });
        }
        return done({ ok: true });
      }
      default:
        return fail("Unknown action.");
    }
  } catch (error) {
    console.error("Editor action failed", error);
    return fail(error instanceof Error ? error.message : "Action failed.", 502);
  }
}
