import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getSupabaseConfig,
  setSessionCookies,
} from "@/lib/server/supabase-session";

const VISITOR_COOKIE = "sasagayo-visitor";
async function rpc(name: string, body: unknown, token?: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
async function table(path: string, token: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}
function json(
  body: unknown,
  status = 200,
  visitorId?: string,
  refreshed?: Parameters<typeof setSessionCookies>[1] | null,
) {
  const result = NextResponse.json(body, { status });
  if (visitorId)
    result.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  if (refreshed) setSessionCookies(result, refreshed);
  return result;
}
export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("scope") === "me") {
      const auth = await authenticateRequest(request);
      if (!auth) return json({ error: "Authentication required." }, 401);
      const [profileResult, eventsResult] = await Promise.all([
        table(
          `profiles?id=eq.${auth.user.id}&select=handle,display_name,bio,location,reputation_points,reputation_title&limit=1`,
          auth.accessToken,
        ),
        table(
          "reputation_events?select=id,event_type,points,reason,created_at&order=created_at.desc&limit=30",
          auth.accessToken,
        ),
      ]);
      return json(
        {
          profile: profileResult.ok ? (await profileResult.json())[0] : null,
          events: eventsResult.ok ? await eventsResult.json() : [],
        },
        200,
        undefined,
        auth.refreshedSession,
      );
    }
    const metricsResult = await rpc("community_metrics", {});
    return metricsResult.ok
      ? json(await metricsResult.json())
      : json({ error: "Metrics unavailable." }, 502);
  } catch (error) {
    console.error("Insights read failed", error);
    return json({ error: "Insights unavailable." }, 503);
  }
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin)
      return json({ error: "Invalid request origin." }, 403);
    const current = request.cookies.get(VISITOR_COOKIE)?.value;
    const visitorId =
      current && /^[0-9a-f-]{36}$/i.test(current)
        ? current
        : crypto.randomUUID();
    const auth = await authenticateRequest(request);
    const path = String(
      (await request.json().catch(() => ({}))).path ?? "/",
    ).split("?")[0];
    const result = await rpc(
      "heartbeat_presence",
      { p_session_id: visitorId, p_path: path },
      auth?.accessToken,
    );
    return result.ok
      ? json(
          { success: true },
          200,
          current ? undefined : visitorId,
          auth?.refreshedSession,
        )
      : json(
          { error: "Presence unavailable." },
          502,
          current ? undefined : visitorId,
        );
  } catch (error) {
    console.error("Presence heartbeat failed", error);
    return json({ error: "Presence unavailable." }, 503);
  }
}
