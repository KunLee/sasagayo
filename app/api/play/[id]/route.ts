import { NextRequest } from "next/server";
import { publicGet } from "@/lib/server/db";
import { r2 } from "@/lib/server/r2";

export const runtime = "nodejs";

/**
 * The address the player streams from. Redirects to our own R2 copy when we
 * have one, otherwise to the archive's file. `?source=1` forces the archive
 * (used as a fallback if our copy ever fails to load).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Unknown recording", { status: 404 });
  const { rows } = await publicGet<{ stream_url: string; object_key: string | null }[]>(
    `tracks?select=stream_url,object_key&status=eq.published&id=eq.${id}&limit=1`,
    { revalidate: 600 },
  ).catch(() => ({ rows: [] }));
  const track = rows[0];
  if (!track) return new Response("Unknown recording", { status: 404 });

  let target = track.stream_url;
  const store = request.nextUrl.searchParams.has("source") ? null : r2();
  if (track.object_key && store) target = await store.playableUrl(track.object_key).catch(() => track.stream_url);
  return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "private, max-age=300" } });
}
