import { createHash } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { getR2Config } from "@/lib/server/r2";
import { compatibleAudioType, discoverMusic, isAllowedDownload, MAX_SOURCE_SIZE, USER_AGENT, type DiscoverySource } from "@/lib/server/music-discovery";

export const runtime = "nodejs";
export const maxDuration = 120;
const RUN_DEADLINE_MS = 55_000;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const STORAGE_TIMEOUT_MS = 12_000;

type QueuedCandidate = {
  id: string; source: DiscoverySource; source_page_url: string; source_file_url: string; source_sha1: string;
  title: string; artist_name: string; detected_license: string; license_url: string; status: "ready" | "approved" | "failed";
  mime_type: string; size_bytes: number; attempt_count: number;
  next_attempt_at: string | null; failure_class: string;
  metadata: { description?: string; attribution?: string; [key: string]: unknown };
};

function bounded(name: string, fallback: number, min: number, max: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service access is not configured.");
  return { url, key };
}
async function database(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  return fetch(`${url}/rest/v1/${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(8_000), cache: "no-store", headers: { apikey: key, ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json", ...init.headers } });
}
function extension(mime: string) {
  return ({ "audio/ogg":"ogg", "audio/mpeg":"mp3", "audio/flac":"flac", "audio/x-flac":"flac", "audio/wav":"wav", "audio/x-wav":"wav", "audio/webm":"webm", "audio/mp4":"m4a" } as Record<string,string>)[mime] ?? "audio";
}
function classify(error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 240) : "Unknown candidate failure.";
  const status = Number(message.match(/\b(4\d\d|5\d\d)\b/)?.[1]);
  if (status === 429 || status >= 500 || /timeout|abort|fetch failed|network/i.test(message)) return { message, kind: "transient", retry: true };
  if (/R2|storage/i.test(message)) return { message, kind: "storage", retry: true };
  if (/database|catalog insert|duplicate check|candidate state/i.test(message)) return { message, kind: "database", retry: true };
  if (/license|rights/i.test(message)) return { message, kind: "rights", retry: false };
  if (/host|metadata|mime|empty|limit|bounds/i.test(message)) return { message, kind: "source", retry: false };
  return { message, kind: "permanent", retry: false };
}
const retryAt = (attempt: number) => new Date(Date.now() + Math.min(72, 2 ** Math.min(attempt, 6)) * 3_600_000).toISOString();
async function updateCandidate(id: string, body: Record<string, unknown>) {
  const response = await database(`music_source_candidates?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Candidate state update failed with ${response.status}.`);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const startedAt = Date.now();
  try {
    const batchSize = bounded("MUSIC_IMPORT_BATCH_SIZE", 2, 1, 2);
    const byteBudget = bounded("MUSIC_IMPORT_MAX_RUN_MB", 100, 1, 250) * 1024 * 1024;
    const delayMs = bounded("MUSIC_IMPORT_DELAY_MS", 1500, 500, 10_000);
    const discovery = await discoverMusic(request.nextUrl.searchParams.get("composer"));
    if (discovery.candidates.length) {
      const registered = await database("rpc/register_music_candidates", { method: "POST", body: JSON.stringify({ p_items: discovery.candidates }) });
      if (!registered.ok) throw new Error(`Candidate registration failed with ${registered.status}: ${(await registered.text()).slice(0, 200)}`);
    }
    const queueResponse = await database("music_source_candidates?status=in.(ready,approved,failed)&source=in.(wikimedia_commons,internet_archive)&select=id,source,source_page_url,source_file_url,source_sha1,title,artist_name,detected_license,license_url,status,mime_type,size_bytes,attempt_count,next_attempt_at,failure_class,metadata&order=discovered_at.asc&limit=50");
    if (!queueResponse.ok) throw new Error(`Import queue failed with ${queueResponse.status}: ${(await queueResponse.text()).slice(0, 200)}`);
    const allQueue = await queueResponse.json() as QueuedCandidate[];
    const queue = allQueue.filter((candidate) => candidate.status !== "failed" || (
      ["transient", "storage", "database"].includes(candidate.failure_class) &&
      candidate.attempt_count < 5 && Boolean(candidate.next_attempt_at) &&
      new Date(candidate.next_attempt_at as string).getTime() <= Date.now()
    ));
    const imports: unknown[] = [], failures: Array<{ candidateId:string; class:string; retrying:boolean; reason:string }> = [];
    let downloadedBytes = 0, examined = 0, skipped = 0, lastDownloadAt = 0;
    for (const candidate of queue) {
      if (imports.length >= batchSize || Date.now() - startedAt >= RUN_DEADLINE_MS - 20_000) break;
      examined += 1;
      try {
        if (!candidate.source_file_url || !candidate.source_sha1 || !candidate.mime_type?.startsWith("audio/") || !candidate.size_bytes || candidate.size_bytes > MAX_SOURCE_SIZE) throw new Error("Candidate metadata is incomplete or out of bounds.");
        const sourceUrl = new URL(candidate.source_file_url);
        if (!isAllowedDownload(candidate.source, sourceUrl)) throw new Error("Candidate source host is not approved.");
        const existingResponse = await database(`catalog_tracks?source_sha1=eq.${encodeURIComponent(candidate.source_sha1)}&select=id&limit=1`);
        if (!existingResponse.ok) throw new Error(`Duplicate check failed with ${existingResponse.status}.`);
        const existing = (await existingResponse.json() as Array<{id:string}>)[0];
        if (existing) { await updateCandidate(candidate.id, { status:"imported", catalog_track_id:existing.id, last_error:"", failure_class:"", next_attempt_at:null }); skipped += 1; continue; }
        if (downloadedBytes + candidate.size_bytes > byteBudget) { skipped += 1; continue; }
        const wait = delayMs - (Date.now() - lastDownloadAt); if (lastDownloadAt && wait > 0) await pause(wait);
        const download = await fetch(sourceUrl, { headers:{ "User-Agent":USER_AGENT }, cache:"no-store", signal:AbortSignal.timeout(Math.min(DOWNLOAD_TIMEOUT_MS, Math.max(1_000, RUN_DEADLINE_MS - (Date.now() - startedAt)))) });
        lastDownloadAt = Date.now();
        if (!download.ok) throw new Error(`Source download failed with ${download.status}.`);
        const length = Number(download.headers.get("content-length") ?? candidate.size_bytes);
        const receivedType = download.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "application/octet-stream";
        if (length <= 0 || length > MAX_SOURCE_SIZE || !compatibleAudioType(candidate.mime_type.toLowerCase(), receivedType, sourceUrl.pathname)) throw new Error(`Downloaded file metadata mismatch (${receivedType}, ${length} bytes).`);
        if (downloadedBytes + length > byteBudget) { await download.body?.cancel(); skipped += 1; continue; }
        const bytes = new Uint8Array(await download.arrayBuffer());
        if (!bytes.length || bytes.length > MAX_SOURCE_SIZE) throw new Error("Downloaded file was empty or exceeded the file limit.");
        downloadedBytes += bytes.length;
        const checksum = createHash("sha256").update(bytes).digest("hex");
        const objectKey = `catalog/${candidate.source}/${candidate.source_sha1}.${extension(candidate.mime_type)}`;
        const { client, bucket } = getR2Config();
        await client.send(new PutObjectCommand({ Bucket:bucket, Key:objectKey, Body:bytes, ContentType:candidate.mime_type, CacheControl:"public, max-age=31536000, immutable", Metadata:{ source:candidate.source, sha256:checksum } }), { abortSignal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });
        const insert = await database("catalog_tracks", { method:"POST", headers:{ Prefer:"return=representation" }, body:JSON.stringify({ source:candidate.source, source_page_url:candidate.source_page_url, source_file_url:candidate.source_file_url, source_sha1:candidate.source_sha1, object_key:objectKey, title:candidate.title.slice(0,240), artist_name:candidate.artist_name.slice(0,240), description:(candidate.metadata.description ?? "").slice(0,2000), mime_type:candidate.mime_type, size_bytes:bytes.length, license_name:candidate.detected_license, license_url:candidate.license_url, attribution:(candidate.metadata.attribution ?? candidate.artist_name).slice(0,1000), metadata:{...candidate.metadata,sha256:checksum}, candidate_id:candidate.id, publication_status:"draft" }) });
        if (!insert.ok) { await client.send(new DeleteObjectCommand({ Bucket:bucket, Key:objectKey }), { abortSignal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) }); throw new Error(`Catalog insert failed: ${(await insert.text()).slice(0,300)}`); }
        const imported = (await insert.json() as Array<{id:string}>)[0];
        await updateCandidate(candidate.id, { status:"imported", catalog_track_id:imported.id, attempt_count:candidate.attempt_count+1, last_error:"", failure_class:"", next_attempt_at:null });
        imports.push(imported);
      } catch (error) {
        const failure = classify(error), attempt = candidate.attempt_count + 1, willRetry = failure.retry && attempt < 5;
        await updateCandidate(candidate.id, { status:"failed", attempt_count:attempt, last_error:failure.message, failure_class:failure.kind, next_attempt_at:willRetry ? retryAt(attempt) : null }).catch(() => undefined);
        failures.push({ candidateId:candidate.id, class:failure.kind, retrying:willRetry, reason:failure.message });
      }
    }
    const sources = ["wikimedia_commons","internet_archive","library_of_congress"];
    return Response.json({ success:true, imported:imports[0] ?? null, imports, discovery:{ composer:discovery.composer, theme:discovery.theme, found:discovery.candidates.length, bySource:Object.fromEntries(sources.map((source)=>[source,discovery.candidates.filter((item)=>item.source===source).length])), errors:discovery.errors }, summary:{ queued:queue.length, requested:batchSize, imported:imports.length, examined, skipped, failures:failures.length, downloadedBytes, durationMs:Date.now()-startedAt, stoppedByDeadline:Date.now()-startedAt>=RUN_DEADLINE_MS }, failures });
  } catch (error) {
    console.error("Daily music import failed", error);
    return Response.json({ error:"Daily music import failed.", detail:error instanceof Error ? error.message.slice(0,240) : undefined }, { status:500 });
  }
}
