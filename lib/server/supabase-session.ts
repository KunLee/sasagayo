import { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "sasagayo-access-token";
export const REFRESH_COOKIE = "sasagayo-refresh-token";

export type SupabaseUser = {
  id: string;
  email?: string;
};

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user?: SupabaseUser;
};

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase is not configured.");
  return { url: url.replace(/\/$/, ""), publishableKey };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setSessionCookies(
  response: NextResponse,
  session: SupabaseSession,
) {
  response.cookies.set(
    ACCESS_COOKIE,
    session.access_token,
    cookieOptions(session.expires_in ?? 3600),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    session.refresh_token,
    cookieOptions(60 * 60 * 24 * 30),
  );
}

async function refreshSession(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  return response.ok ? ((await response.json()) as SupabaseSession) : null;
}

async function fetchUser(accessToken: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

export async function authenticateRequest(request: NextRequest) {
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let refreshedSession: SupabaseSession | null = null;
  let userResponse = accessToken ? await fetchUser(accessToken) : null;

  if (!userResponse?.ok) {
    refreshedSession = await refreshSession(request);
    accessToken = refreshedSession?.access_token;
    userResponse = accessToken ? await fetchUser(accessToken) : null;
  }

  if (!accessToken || !userResponse?.ok) return null;
  const user = (await userResponse.json()) as SupabaseUser;
  return { accessToken, user, refreshedSession };
}

