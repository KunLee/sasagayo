import { createHash } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { getR2Config } from "@/lib/server/r2";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SOURCE_SIZE = 40 * 1024 * 1024;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
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
  });
  if (!response.ok)
    throw new Error(`Commons search failed with ${response.status}.`);
  const payload = (await response.json()) as {
    query?: { pages?: Candidate[] };
  };
  return payload.query?.pages ?? [];
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const options = await candidates();
    for (const candidate of options) {
      const file = candidate.imageinfo?.[0];
      const meta = file?.extmetadata ?? {};
      const license = text(meta.LicenseShortName?.value);
      if (
        !file?.url ||
        !file.mime?.startsWith("audio/") ||
        !file.sha1 ||
        !file.size ||
        file.size > MAX_SOURCE_SIZE
      )
        continue;
      const sourceUrl = new URL(file.url);
      if (
        sourceUrl.protocol !== "https:" ||
        (sourceUrl.hostname !== "wikimedia.org" &&
          !sourceUrl.hostname.endsWith(".wikimedia.org"))
      )
        continue;
      const sourcePageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(candidate.title.replaceAll(" ", "_"))}`;
      const title = text(
        meta.ObjectName?.value,
        candidate.title.replace(/^File:/, ""),
      );
      const artist = text(
        meta.Artist?.value || meta.Credit?.value,
        "Unknown creator",
      );
      if (!ALLOWED_LICENSE.test(license)) {
        await database("music_source_candidates", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates" },
          body: JSON.stringify({
            source: "wikimedia_commons",
            source_page_url: sourcePageUrl,
            source_file_url: file.url,
            title: title.slice(0, 240),
            artist_name: artist.slice(0, 240),
            detected_license: license || "Unknown",
            license_url: text(meta.LicenseUrl?.value),
            rights_evidence:
              "License metadata discovered through the Wikimedia Commons API; automatic redistribution was not approved by the Sasagayo allowlist.",
          }),
        });
        continue;
      }
      const existing = await database(
        `catalog_tracks?source_sha1=eq.${encodeURIComponent(file.sha1)}&select=id&limit=1`,
      );
      if (existing.ok && (await existing.json()).length) continue;

      const download = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "Sasagayo/1.0 (https://ai.kumind.com.au/contact)",
        },
        cache: "no-store",
      });
      if (!download.ok) continue;
      const declaredLength = Number(
        download.headers.get("content-length") ?? file.size,
      );
      const receivedType = download.headers
        .get("content-type")
        ?.split(";")[0]
        .toLowerCase();
      if (
        declaredLength > MAX_SOURCE_SIZE ||
        receivedType !== file.mime.toLowerCase()
      )
        continue;
      const bytes = new Uint8Array(await download.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_SOURCE_SIZE) continue;
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const objectKey = `catalog/wikimedia/${file.sha1}.${extension(file.mime)}`;
      const { client, bucket } = getR2Config();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: bytes,
          ContentType: file.mime,
          CacheControl: "public, max-age=31536000, immutable",
          Metadata: { source: "wikimedia-commons", sha256: checksum },
        }),
      );

      const attribution = text(
        meta.Attribution?.value || meta.Credit?.value || meta.Artist?.value,
        artist,
      );
      const insert = await database("catalog_tracks", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          source: "wikimedia_commons",
          source_page_url: sourcePageUrl,
          source_file_url: file.url,
          source_sha1: file.sha1,
          object_key: objectKey,
          title: title.slice(0, 240),
          artist_name: artist.slice(0, 240),
          description: text(meta.ImageDescription?.value).slice(0, 2000),
          mime_type: file.mime,
          size_bytes: bytes.length,
          license_name: license,
          license_url: text(meta.LicenseUrl?.value),
          attribution: attribution.slice(0, 1000),
          metadata: { commonsPageId: candidate.pageid, sha256: checksum },
        }),
      });
      if (!insert.ok) {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        const details = await insert.text();
        throw new Error(`Catalog insert failed: ${details.slice(0, 300)}`);
      }
      return Response.json({
        success: true,
        imported: (await insert.json())[0],
      });
    }
    return Response.json({
      success: true,
      imported: null,
      message: "No new compatible licensed track was found today.",
    });
  } catch (error) {
    console.error("Daily music import failed", error);
    return Response.json(
      { error: "Daily music import failed." },
      { status: 500 },
    );
  }
}
