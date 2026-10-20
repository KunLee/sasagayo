import { NextRequest } from "next/server";
import { getTrack, radioTracks } from "@/lib/catalog";

/** `?seed=<track id>&exclude=<ids>` → up to 10 similar recordings to keep playing. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const exclude = new Set((params.get("exclude") ?? "").split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 300));
  try {
    const seed = params.get("seed") ? await getTrack(params.get("seed") ?? "") : null;
    if (seed) exclude.add(seed.id);
    const tracks = await radioTracks(seed, exclude);
    return Response.json({ tracks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Radio failed", error);
    return Response.json({ tracks: [] }, { status: 503 });
  }
}
