import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getSupabaseConfig,
  setSessionCookies,
} from "@/lib/server/supabase-session";

function reply(
  body: unknown,
  status: number,
  refreshed?: Parameters<typeof setSessionCookies>[1] | null,
) {
  const response = NextResponse.json(body, { status });
  if (refreshed) setSessionCookies(response, refreshed);
  return response;
}

async function rpc(name: string, token: string, body: unknown = {}) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

async function requireAdmin(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth)
    return {
      error: reply({ error: "Authentication required." }, 401),
    } as const;
  const check = await rpc("admin_overview", auth.accessToken);
  if (!check.ok)
    return {
      error: reply(
        { error: "Administrator access required." },
        403,
        auth.refreshedSession,
      ),
    } as const;
  return { auth, overview: await check.json() } as const;
}

export async function GET(request: NextRequest) {
  try {
    const checked = await requireAdmin(request);
    if ("error" in checked) return checked.error;
    const view = request.nextUrl.searchParams.get("view") ?? "overview";
    const q = request.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
    const map: Record<string, [string, object]> = {
      users: ["admin_users", { p_search: q, p_limit: 100 }],
      activity: ["admin_activity", { p_limit: 100 }],
      reports: ["admin_reports", {}],
      audit: ["admin_audit", { p_limit: 100 }],
    };
    if (view === "overview")
      return reply(
        { overview: checked.overview },
        200,
        checked.auth.refreshedSession,
      );
    if (!map[view])
      return reply(
        { error: "Unknown admin view." },
        400,
        checked.auth.refreshedSession,
      );
    const result = await rpc(
      map[view][0],
      checked.auth.accessToken,
      map[view][1],
    );
    return result.ok
      ? reply(
          { items: await result.json() },
          200,
          checked.auth.refreshedSession,
        )
      : reply(
          { error: "Admin data unavailable." },
          502,
          checked.auth.refreshedSession,
        );
  } catch (error) {
    console.error("Admin read failed", error);
    return reply({ error: "Administration service unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin)
      return reply({ error: "Invalid request origin." }, 403);
    const checked = await requireAdmin(request);
    if ("error" in checked) return checked.error;
    const body = (await request.json()) as {
      action?: string;
      userId?: string;
      role?: string;
      status?: string;
      points?: number;
      reportId?: string;
      reason?: string;
    };
    const reason = body.reason?.trim() ?? "";
    const calls: Record<string, [string, object]> = {
      "set-role": [
        "admin_set_role",
        { p_user_id: body.userId, p_role: body.role, p_reason: reason },
      ],
      "set-status": [
        "admin_set_account_status",
        { p_user_id: body.userId, p_status: body.status, p_reason: reason },
      ],
      "adjust-reputation": [
        "admin_adjust_reputation",
        { p_user_id: body.userId, p_points: body.points, p_reason: reason },
      ],
      "resolve-report": [
        "admin_resolve_report",
        { p_report_id: body.reportId, p_status: body.status, p_reason: reason },
      ],
    };
    if (!body.action || !calls[body.action])
      return reply(
        { error: "Unknown admin action." },
        400,
        checked.auth.refreshedSession,
      );
    const result = await rpc(
      calls[body.action][0],
      checked.auth.accessToken,
      calls[body.action][1],
    );
    if (!result.ok) {
      const details = await result.json().catch(() => ({}));
      return reply(
        { error: details.message ?? "Administrative action failed." },
        400,
        checked.auth.refreshedSession,
      );
    }
    return reply({ success: true }, 200, checked.auth.refreshedSession);
  } catch (error) {
    console.error("Admin action failed", error);
    return reply({ error: "Administration service unavailable." }, 503);
  }
}
