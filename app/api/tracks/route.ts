import { after, NextRequest } from "next/server";
import { track } from "@/lib/server/analytics";
import { authenticateRequest } from "@/lib/server/supabase-session";
import { getTracks, searchTracks } from "@/lib/catalog";
import { publicRpc } from "@/lib/server/db";

/** Client lookups: `?ids=a,b,c` for shared mixes, `?q=` for instant search. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    if (params.has("ids")) {
      return Response.json({ tracks: await getTracks((params.get("ids") ?? "").split(",")) });
    }
    const { tracks, total } = await searchTracks(params.get("q") ?? "", { pageSize: 8 });
    return Response.json({ tracks, total }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Track lookup failed", error);
    return Response.json({ error: "The library is unavailable right now." }, { status: 503 });
  }
}

/** Counts a play once a listener has stayed for 30 seconds. */
export async function POST(request: NextRequest) {
  const { id, composer, via, editor } = (await request.json().catch(() => ({}))) as { id?: string; composer?: string; via?: string; editor?: boolean };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Unknown track." }, { status: 400 });
  await publicRpc("record_play", { p_track_id: id }, { revalidate: 0 }).catch(() => undefined);
  // Editors previewing in the desk are not listeners.
  if (!editor) {
    after(async () => {
      const auth = request.cookies.has("sasagayo-access-token") ? await authenticateRequest(request).catch(() => null) : null;
      await track(request.headers, {
        type: "play",
        track_id: id,
        composer_slug: typeof composer === "string" ? composer.slice(0, 40) : null,
        via: via === "radio" ? "radio" : "listen",
        user_id: auth?.user.id ?? null,
      });
    });
  }
  return Response.json({ ok: true });
}
