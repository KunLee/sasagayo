import { USER_AGENT } from "./discovery/sources.ts";
import { serviceFetch, serviceJson } from "./server/db.ts";
import { r2 } from "./server/r2.ts";

const MAX_BYTES = 80 * 1024 * 1024;
const TYPES: Record<string, string> = { mp3: "audio/mpeg", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac", wav: "audio/wav", m4a: "audio/mp4", opus: "audio/ogg" };

type Pending = { id: string; stream_url: string; mirror_attempts: number };
export type MirrorSummary = { copied: number; failed: number; bytes: number; remaining: number | null; errors: string[] };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extensionOf(url: string) {
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ? ext : "mp3";
}

/**
 * Copies published recordings that we only link to into our own R2 bucket,
 * most-played first, until the time budget runs out. Each copy is committed
 * on its own; a file that fails three times is left linked to its archive.
 */
export async function mirrorBatch(budgetMs: number): Promise<MirrorSummary> {
  const started = Date.now();
  const store = r2();
  const summary: MirrorSummary = { copied: 0, failed: 0, bytes: 0, remaining: null, errors: [] };
  if (!store) {
    summary.errors.push("R2 is not configured.");
    return summary;
  }
  const queue = await serviceJson<Pending[]>(
    "tracks?select=id,stream_url,mirror_attempts&status=eq.published&object_key=is.null&mirror_attempts=lt.3&order=play_count.desc,quality_score.desc&limit=200",
  );
  for (const track of queue) {
    // Leave room to finish the current file inside the budget.
    if (Date.now() - started > budgetMs - 20_000) break;
    const ext = extensionOf(track.stream_url);
    const key = `tracks/${track.id}.${ext}`;
    try {
      const response = await fetch(track.stream_url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`source responded ${response.status}`);
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (declared > MAX_BYTES) throw new Error(`file too large (${Math.round(declared / 1048576)} MB)`);
      const body = await response.arrayBuffer();
      if (!body.byteLength || body.byteLength > MAX_BYTES) throw new Error("empty or oversized download");
      await store.put(key, body, TYPES[ext]);
      await serviceJson(`tracks?id=eq.${track.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ object_key: key, mirrored_at: new Date().toISOString(), mirror_error: "" }),
      });
      summary.copied += 1;
      summary.bytes += body.byteLength;
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      summary.failed += 1;
      summary.errors.push(`${track.id}: ${message}`);
      await serviceJson(`tracks?id=eq.${track.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ mirror_attempts: track.mirror_attempts + 1, mirror_error: message }),
      }).catch(() => undefined);
    }
    // Be a polite client of Wikimedia and the Internet Archive.
    await pause(400);
  }
  summary.remaining = await serviceFetch("tracks?select=id&status=eq.published&object_key=is.null&mirror_attempts=lt.3&limit=1", { headers: { Prefer: "count=exact" } })
    .then((response) => Number(response.headers.get("content-range")?.split("/")[1] ?? 0))
    .catch(() => null);
  summary.errors = summary.errors.slice(0, 10);
  return summary;
}
