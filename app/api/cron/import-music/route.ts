import { createHash } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { getR2Config } from "@/lib/server/r2";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SOURCE_SIZE = 40 * 1024 * 1024;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 10;
const DEFAULT_RUN_BYTE_BUDGET = 100 * 1024 * 1024;
const MAX_RUN_BYTE_BUDGET = 250 * 1024 * 1024;
const DEFAULT_DOWNLOAD_DELAY_MS = 1_500;
const MAX_DOWNLOAD_DELAY_MS = 10_000;
const RUN_DEADLINE_MS = 105_000;
const REQUEST_TIMEOUT_MS = 25_000;
const ALLOWED_LICENSE =
  /^(Public domain|CC0(?: 1\.0)?|CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0))$/i;
type Meta = { value?: string };
type Candidate = {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    url?: string;
    mime?: string;
    size?: number;
    sha1?: string;
    extmetadata?: Record<string, Meta>;
  }>;
};
type DiscoveredCandidate = {
  source: "wikimedia_commons";
  source_page_url: string;
  source_file_url: string;
  source_sha1: string;
  title: string;
  artist_name: string;
  detected_license: string;
  license_url: string;
  rights_evidence: string;
  status: "ready" | "pending";
  mime_type: string;
  size_bytes: number;
  metadata: Record<string, unknown>;
};
type QueuedCandidate = {
  id: string;
  source_page_url: string;
  source_file_url: string;
  source_sha1: string;
  title: string;
  artist_name: string;
  detected_license: string;
  license_url: string;
  rights_evidence: string;
  status: "ready" | "approved";
  mime_type: string;
  size_bytes: number;
  attempt_count: number;
  metadata: {
    description?: string;
    attribution?: string;
    commonsPageId?: number;
  };
};

function boundedInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function pause(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function text(value?: string, fallback = "") {
  return (value ?? fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extension(mime: string) {
  return (
    (
      {
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3",
        "audio/flac": "flac",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/webm": "webm",
      } as Record<string, string>
    )[mime] ?? "audio"
  );
}

function serviceConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase service access is not configured.");
  return { url, key };
}

async function database(path: string, init: RequestInit = {}) {
  const { url, key } = serviceConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      ...(key.startsWith("sb_secret_")
        ? {}
        : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

async function candidates() {
  const themes = [
    "baroque classical music",
    "classical period music",
    "romantic classical music",
    "classical piano music",
    "classical chamber music",
    "classical orchestral music",
    "early classical music",
  ];
  const theme = themes[Math.floor(Date.now() / 86_400_000) % themes.length];
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${theme} filetype:audio`,
    gsrnamespace: "6",
    gsrlimit: "30",
    gsrwhat: "text",
    prop: "imageinfo",
    iiprop: "url|mime|size|sha1|extmetadata",
    iiextmetadatalanguage: "en",
    iiextmetadatafilter:
      "ObjectName|ImageDescription|Artist|Credit|LicenseShortName|LicenseUrl|Attribution|AttributionRequired",
  });
  const response = await fetch(`${COMMONS_API}?${query}`, {
    headers: {
      "User-Agent": "Sasagayo/1.0 (https://ai.kumind.com.au/contact)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok)
    throw new Error(`Commons search failed with ${response.status}.`);
  const payload = (await response.json()) as {
    query?: { pages?: Candidate[] };
  };
  return payload.query?.pages ?? [];
}

function normalizeCandidate(candidate: Candidate): DiscoveredCandidate | null {
  const file = candidate.imageinfo?.[0];
  const meta = file?.extmetadata ?? {};
  if (
    !file?.url ||
    !file.mime?.startsWith("audio/") ||
    !file.sha1 ||
    !file.size ||
    file.size > MAX_SOURCE_SIZE
  )
    return null;
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(file.url);
  } catch {
    return null;
  }
  if (
    sourceUrl.protocol !== "https:" ||
    (sourceUrl.hostname !== "wikimedia.org" &&
      !sourceUrl.hostname.endsWith(".wikimedia.org"))
  )
    return null;
  const license = text(meta.LicenseShortName?.value);
  const artist = text(
    meta.Artist?.value || meta.Credit?.value,
    "Unknown creator",
  );
  const sourcePageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(candidate.title.replaceAll(" ", "_"))}`;
  return {
    source: "wikimedia_commons",
    source_page_url: sourcePageUrl,
    source_file_url: sourceUrl.toString(),
    source_sha1: file.sha1,
    title: text(
      meta.ObjectName?.value,
      candidate.title.replace(/^File:/, ""),
    ).slice(0, 240),
    artist_name: artist.slice(0, 240),
    detected_license: license || "Unknown",
    license_url: text(meta.LicenseUrl?.value),
    rights_evidence: ALLOWED_LICENSE.test(license)
      ? "License metadata matched the Sasagayo automatic redistribution allowlist."
      : "License metadata was discovered through Wikimedia Commons but requires administrator review before redistribution.",
    status: ALLOWED_LICENSE.test(license) ? "ready" : "pending",
    mime_type: file.mime.toLowerCase(),
    size_bytes: file.size,
    metadata: {
      commonsPageId: candidate.pageid,
      description: text(meta.ImageDescription?.value).slice(0, 2000),
      attribution: text(
        meta.Attribution?.value || meta.Credit?.value || meta.Artist?.value,
        artist,
      ).slice(0, 1000),
    },
  };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const startedAt = Date.now();
    const batchSize = boundedInteger(
      "MUSIC_IMPORT_BATCH_SIZE",
      DEFAULT_BATCH_SIZE,
      1,
      MAX_BATCH_SIZE,
    );
    const runByteBudgetMb = boundedInteger(
      "MUSIC_IMPORT_MAX_RUN_MB",
      DEFAULT_RUN_BYTE_BUDGET / 1024 / 1024,
      1,
      MAX_RUN_BYTE_BUDGET / 1024 / 1024,
    );
    const runByteBudget = runByteBudgetMb * 1024 * 1024;
    const downloadDelayMs = boundedInteger(
      "MUSIC_IMPORT_DELAY_MS",
      DEFAULT_DOWNLOAD_DELAY_MS,
      500,
      MAX_DOWNLOAD_DELAY_MS,
    );
    const options = await candidates();
    const discoveries = options
      .map(normalizeCandidate)
      .filter((item): item is DiscoveredCandidate => item !== null);
    if (discoveries.length) {
      const registered = await database("rpc/register_music_candidates", {
        method: "POST",
        body: JSON.stringify({ p_items: discoveries }),
      });
      if (!registered.ok)
        throw new Error(
          `Candidate registration failed with ${registered.status}.`,
        );
    }
    const queueResponse = await database(
      "music_source_candidates?status=in.(ready,approved)&source=eq.wikimedia_commons&select=id,source_page_url,source_file_url,source_sha1,title,artist_name,detected_license,license_url,rights_evidence,status,mime_type,size_bytes,attempt_count,metadata&order=discovered_at.asc&limit=50",
    );
    if (!queueResponse.ok)
      throw new Error(`Import queue failed with ${queueResponse.status}.`);
    const queue = (await queueResponse.json()) as QueuedCandidate[];
    const imports: unknown[] = [];
    const failures: Array<{ pageId: number; reason: string }> = [];
    let examined = 0;
    let skipped = 0;
    let downloadedBytes = 0;
    let lastDownloadAt = 0;
    for (const candidate of queue) {
      if (
        imports.length >= batchSize ||
        Date.now() - startedAt >= RUN_DEADLINE_MS
      )
        break;
      examined += 1;
      try {
        if (
          !candidate.source_file_url ||
          !candidate.source_sha1 ||
          !candidate.mime_type?.startsWith("audio/") ||
          !candidate.size_bytes ||
          candidate.size_bytes > MAX_SOURCE_SIZE
        )
          throw new Error("Candidate metadata is incomplete or out of bounds.");
        const sourceUrl = new URL(candidate.source_file_url);
        if (
          sourceUrl.protocol !== "https:" ||
          (sourceUrl.hostname !== "wikimedia.org" &&
            !sourceUrl.hostname.endsWith(".wikimedia.org"))
        )
          throw new Error("Candidate source host is not approved.");
      const existing = await database(
        `catalog_tracks?source_sha1=eq.${encodeURIComponent(candidate.source_sha1)}&select=id&limit=1`,
      );
      if (!existing.ok)
        throw new Error(`Duplicate check failed with ${existing.status}.`);
      if ((await existing.json()).length) {
        const existingTrack = (await database(
          `catalog_tracks?source_sha1=eq.${encodeURIComponent(candidate.source_sha1)}&select=id&limit=1`,
        ).then((response) => response.json()))[0];
        await database(`music_source_candidates?id=eq.${candidate.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "imported",
            catalog_track_id: existingTrack?.id,
            last_error: "",
          }),
        });
        skipped += 1;
        continue;
      }
      if (downloadedBytes + candidate.size_bytes > runByteBudget) {
        skipped += 1;
        continue;
      }

      const waitFor = downloadDelayMs - (Date.now() - lastDownloadAt);
      if (lastDownloadAt && waitFor > 0) await pause(waitFor);

      const download = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "Sasagayo/1.0 (https://ai.kumind.com.au/contact)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      lastDownloadAt = Date.now();
      if (!download.ok)
        throw new Error(`Source download failed with ${download.status}.`);
      const declaredLength = Number(
        download.headers.get("content-length") ?? candidate.size_bytes,
      );
      const receivedType = download.headers
        .get("content-type")
        ?.split(";")[0]
        .toLowerCase();
      if (
        declaredLength > MAX_SOURCE_SIZE ||
        receivedType !== candidate.mime_type.toLowerCase()
      )
        throw new Error("Downloaded file metadata did not match discovery metadata.");
      if (downloadedBytes + declaredLength > runByteBudget) {
        await download.body?.cancel();
        skipped += 1;
        continue;
      }
      const bytes = new Uint8Array(await download.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_SOURCE_SIZE)
        throw new Error("Downloaded file was empty or exceeded the file limit.");
      if (downloadedBytes + bytes.length > runByteBudget) {
        skipped += 1;
        continue;
      }
      downloadedBytes += bytes.length;
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const objectKey = `catalog/wikimedia/${candidate.source_sha1}.${extension(candidate.mime_type)}`;
      const { client, bucket } = getR2Config();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: bytes,
          ContentType: candidate.mime_type,
          CacheControl: "public, max-age=31536000, immutable",
          Metadata: { source: "wikimedia-commons", sha256: checksum },
        }),
      );

      const insert = await database("catalog_tracks", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          source: "wikimedia_commons",
          source_page_url: candidate.source_page_url,
          source_file_url: candidate.source_file_url,
          source_sha1: candidate.source_sha1,
          object_key: objectKey,
          title: candidate.title.slice(0, 240),
          artist_name: candidate.artist_name.slice(0, 240),
          description: (candidate.metadata.description ?? "").slice(0, 2000),
          mime_type: candidate.mime_type,
          size_bytes: bytes.length,
          license_name: candidate.detected_license,
          license_url: candidate.license_url,
          attribution: (candidate.metadata.attribution ?? candidate.artist_name).slice(0, 1000),
          metadata: {
            commonsPageId: candidate.metadata.commonsPageId,
            sha256: checksum,
          },
          candidate_id: candidate.id,
          publication_status: "draft",
        }),
      });
      if (!insert.ok) {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        const details = await insert.text();
        throw new Error(`Catalog insert failed: ${details.slice(0, 300)}`);
      }
      const imported = (await insert.json())[0];
      const candidateUpdate = await database(
        `music_source_candidates?id=eq.${candidate.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "imported",
            catalog_track_id: imported.id,
            attempt_count: candidate.attempt_count + 1,
            last_error: "",
          }),
        },
      );
      if (!candidateUpdate.ok)
        throw new Error("Imported candidate state could not be updated.");
      imports.push(imported);
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message.slice(0, 160)
            : "Unknown candidate failure.";
        await database(`music_source_candidates?id=eq.${candidate.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "failed",
            attempt_count: candidate.attempt_count + 1,
            last_error: reason,
          }),
        }).catch(() => undefined);
        failures.push({
          pageId: candidate.metadata.commonsPageId ?? 0,
          reason,
        });
      }
    }
    return Response.json({
      success: true,
      // Keep `imported` backward compatible for existing callers.
      imported: imports[0] ?? null,
      imports,
      summary: {
        discovered: discoveries.length,
        queued: queue.length,
        requested: batchSize,
        imported: imports.length,
        examined,
        skipped,
        failures: failures.length,
        downloadedBytes,
        durationMs: Date.now() - startedAt,
        stoppedByDeadline: Date.now() - startedAt >= RUN_DEADLINE_MS,
      },
      failures,
      message: imports.length
        ? `Imported ${imports.length} licensed track${imports.length === 1 ? "" : "s"}.`
        : "No new compatible licensed track was found in this run.",
    });
  } catch (error) {
    console.error("Daily music import failed", error);
    return Response.json(
      { error: "Daily music import failed." },
      { status: 500 },
    );
  }
}
