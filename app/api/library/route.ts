import { NextRequest } from "next/server";
import { asUser, currentAccount, reply, rpcAsUser } from "@/lib/server/as-user";

export const dynamic = "force-dynamic";
const TRACK_FIELDS = "id,title,composer_slug,composer_name,performer,duration_seconds,stream_url";

/** The signed-in listener's saved recordings, in order. */
export async function GET(request: NextRequest) {
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in." }, null, 401);
  const response = await asUser(session.accessToken, `library_items?select=position,track:tracks(${TRACK_FIELDS})&order=position&limit=500`);
  if (!response.ok) return reply({ error: "Your library could not be loaded." }, session.refreshedSession, 502);
  const rows = (await response.json()) as { track: unknown }[];
  // Tracks an editor has since hidden come back as null; leave them out.
  return reply({ tracks: rows.map((row) => row.track).filter(Boolean) }, session.refreshedSession);
}

/** Replaces the library with the given ordered list of track ids. */
export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in." }, null, 401);
  const { ids } = (await request.json().catch(() => ({}))) as { ids?: unknown };
  const valid = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500) : null;
  if (!valid) return reply({ error: "Send an ordered list of recording ids." }, session.refreshedSession, 400);
  try {
    const saved = await rpcAsUser<number>(session.accessToken, "set_my_library", { p_track_ids: valid });
    return reply({ saved }, session.refreshedSession);
  } catch (error) {
    const status = (error as { status?: number }).status === 403 ? 403 : 400;
    return reply({ error: error instanceof Error ? error.message : "Could not save your library." }, session.refreshedSession, status);
  }
}
