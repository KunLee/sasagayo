import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "sasagayo-access-token";
const REFRESH_COOKIE = "sasagayo-refresh-token";
const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user?: unknown;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY.");
  }
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

function setSessionCookies(response: NextResponse, session: SupabaseSession) {
  response.cookies.set(
    ACCESS_COOKIE,
    session.access_token,
    cookieOptions(session.expires_in ?? ACCESS_MAX_AGE),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    session.refresh_token,
    cookieOptions(REFRESH_MAX_AGE),
  );
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

async function tokenRequest(
  grantType: "password" | "refresh_token",
  body: Record<string, string>,
) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/auth/v1/token?grant_type=${grantType}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

async function refreshSession(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const response = await tokenRequest("refresh_token", {
    refresh_token: refreshToken,
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

async function recordLogin(accessToken: string) {
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/record_login`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) console.error("Could not record login activity");
}

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    let refreshed: SupabaseSession | null = null;

    if (!accessToken) {
      refreshed = await refreshSession(request);
      accessToken = refreshed?.access_token;
    }
    if (!accessToken) return NextResponse.json({ user: null });

    let userResponse = await fetchUser(accessToken);
    if (!userResponse.ok && !refreshed) {
      refreshed = await refreshSession(request);
      if (refreshed) userResponse = await fetchUser(refreshed.access_token);
    }
    if (!userResponse.ok) {
      const response = NextResponse.json({ user: null });
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({ user: await userResponse.json() });
    if (refreshed) setSessionCookies(response, refreshed);
    return response;
  } catch (error) {
    console.error("Supabase session check failed", error);
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      action?: "signup" | "login" | "refresh" | "logout";
      email?: string;
      password?: string;
    };

    if (body.action === "signup") {
      if (!body.email || !body.password || body.password.length < 8) {
        return NextResponse.json(
          {
            error:
              "A valid email and password of at least 8 characters are required.",
          },
          { status: 400 },
        );
      }
      const { url, publishableKey } = getSupabaseConfig();
      const signUpResponse = await fetch(`${url}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: body.email, password: body.password }),
        cache: "no-store",
      });
      const payload = await signUpResponse.json();
      if (!signUpResponse.ok) {
        return NextResponse.json(
          {
            error:
              payload.msg ?? payload.error_description ?? "Sign-up failed.",
          },
          { status: signUpResponse.status },
        );
      }
      const response = NextResponse.json({
        user: payload.user,
        confirmationRequired: !payload.access_token,
      });
      if (payload.access_token && payload.refresh_token) {
        setSessionCookies(response, payload as SupabaseSession);
        await recordLogin(payload.access_token);
      }
      return response;
    }

    if (body.action === "login") {
      if (!body.email || !body.password) {
        return NextResponse.json(
          { error: "Email and password are required." },
          { status: 400 },
        );
      }
      const tokenResponse = await tokenRequest("password", {
        email: body.email,
        password: body.password,
      });
      const payload = await tokenResponse.json();
      if (!tokenResponse.ok) {
        return NextResponse.json(
          {
            error: payload.error_description ?? payload.msg ?? "Login failed.",
          },
          { status: tokenResponse.status },
        );
      }
      const session = payload as SupabaseSession;
      const response = NextResponse.json({ user: session.user });
      setSessionCookies(response, session);
      await recordLogin(session.access_token);
      return response;
    }

    if (body.action === "refresh") {
      const session = await refreshSession(request);
      if (!session) {
        const response = NextResponse.json(
          { error: "Session has expired." },
          { status: 401 },
        );
        clearSessionCookies(response);
        return response;
      }
      const response = NextResponse.json({ user: session.user });
      setSessionCookies(response, session);
      return response;
    }

    if (body.action === "logout") {
      const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
      if (accessToken) {
        const { url, publishableKey } = getSupabaseConfig();
        await fetch(`${url}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
      }
      const response = NextResponse.json({ success: true });
      clearSessionCookies(response);
      return response;
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Supabase authentication request failed", error);
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 },
    );
  }
}
