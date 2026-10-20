import { NextResponse, type NextRequest } from "next/server";
import { dbConfig } from "./db.ts";
import { authenticateRequest, setSessionCookies } from "./supabase-session.ts";

export type Account = {
  id: string; email: string; displayName: string; status: "active" | "suspended"; role: "admin" | "moderator" | "member"; createdAt: string;
  handle: string; motto: string; bio: string; avatarUrl: string | null; favoriteComposers: string[]; libraryPublic: boolean;
};

/** PostgREST call made as the signed-in user, so row-level security applies. */
export async function asUser(token: string, path: string, init: RequestInit = {}) {
  const { url, publishableKey } = dbConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
}

export async function rpcAsUser<T>(token: string, name: string, body: unknown = {}) {
  const response = await asUser(token, `rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(payload?.message ?? `${name} failed`), { status: response.status });
  return payload as T;
}

/** Resolves the session and account; refreshed tokens are written back by `reply`. */
export async function currentAccount(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return null;
  const account = await rpcAsUser<Account | null>(auth.accessToken, "my_account").catch(() => null);
  if (!account) return null;
  return { ...auth, account };
}

export function reply(body: unknown, refreshed: Parameters<typeof setSessionCookies>[1] | null | undefined, status = 200) {
  const response = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (refreshed) setSessionCookies(response, refreshed);
  return response;
}
