/** Thin PostgREST client. The service key never leaves the server. */

type Config = { url: string; publishableKey: string; secretKey: string | undefined };

export function dbConfig(): Config {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set.");
  return { url, publishableKey, secretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY };
}

export class DbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function check(response: Response, label: string) {
  if (response.ok) return response;
  const detail = (await response.text().catch(() => "")).slice(0, 300);
  throw new DbError(response.status, `${label} failed with ${response.status}: ${detail}`);
}

/** Anonymous read, cached by Next and invalidated with the "tracks" tag. */
export async function publicGet<T>(path: string, options: { revalidate?: number; tags?: string[]; count?: boolean } = {}) {
  const { url, publishableKey } = dbConfig();
  const response = await check(await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: publishableKey, ...(options.count ? { Prefer: "count=exact" } : {}) },
    next: { revalidate: options.revalidate ?? 300, tags: options.tags ?? ["tracks"] },
    signal: AbortSignal.timeout(10_000),
  }), "Catalogue read");
  const total = Number(response.headers.get("content-range")?.split("/")[1]);
  return { rows: (await response.json()) as T, total: Number.isFinite(total) ? total : null };
}

export async function publicRpc<T>(name: string, body: unknown = {}, options: { revalidate?: number } = {}) {
  const { url, publishableKey } = dbConfig();
  const response = await check(await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(options.revalidate === 0
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate ?? 300, tags: ["tracks"] } }),
    signal: AbortSignal.timeout(10_000),
  }), `RPC ${name}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Privileged access for the crawler and admin actions. */
export async function serviceFetch(path: string, init: RequestInit = {}) {
  const { url, secretKey } = dbConfig();
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY must be set for discovery and administration.");
  return check(await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
    headers: {
      apikey: secretKey,
      ...(secretKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${secretKey}` }),
      "Content-Type": "application/json",
      ...init.headers,
    },
  }), `Database ${init.method ?? "GET"} ${path.split("?")[0]}`);
}

export async function serviceJson<T>(path: string, init: RequestInit = {}) {
  const response = await serviceFetch(path, init);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Quotes a value for a PostgREST `in.(...)` list. */
export function inList(values: string[]) {
  return `(${values.map((value) => `"${value.replace(/["\\]/g, "\\$&")}"`).join(",")})`;
}
