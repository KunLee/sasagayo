import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";
import { getR2Config } from "@/lib/server/r2";
import { getSupabaseConfig } from "@/lib/server/supabase-session";

async function catalog(path: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: publishableKey },
    cache: "no-store",
  });
}
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const download = request.nextUrl.searchParams.get("mode") === "download";
    if (id) {
      const result = await catalog(
        `catalog_tracks?id=eq.${encodeURIComponent(id)}&select=id,object_key,mime_type,title&limit=1`,
      );
      const item = result.ok ? (await result.json())[0] : null;
      if (!item)
        return Response.json({ error: "Track not found." }, { status: 404 });
      const { client, bucket } = getR2Config();
      const extension =
        (
          {
            "audio/ogg": "ogg",
            "audio/mpeg": "mp3",
            "audio/flac": "flac",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/webm": "webm",
          } as Record<string, string>
        )[item.mime_type] ?? "audio";
      const streamUrl = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: item.object_key,
          ResponseContentType: item.mime_type,
          ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename="sasagayo-${item.id}.${extension}"`,
        }),
        { expiresIn: 600 },
      );
      return Response.json(
        download
          ? { downloadUrl: streamUrl, expiresIn: 600 }
          : { streamUrl, expiresIn: 600 },
      );
    }
    const [result, referencesResult] = await Promise.all([
      catalog(
        "catalog_tracks?select=id,title,artist_name,description,mime_type,size_bytes,license_name,license_url,attribution,source_page_url,imported_at&order=imported_at.desc&limit=50",
      ),
      catalog(
        "catalog_references?select=id,title,artist_name,external_url,source,license_name,license_url,created_at&order=created_at.desc&limit=50",
      ),
    ]);
    return result.ok && referencesResult.ok
      ? Response.json({
          tracks: await result.json(),
          references: await referencesResult.json(),
        })
      : Response.json({ error: "Catalog unavailable." }, { status: 502 });
  } catch (error) {
    console.error("Catalog read failed", error);
    return Response.json({ error: "Catalog unavailable." }, { status: 503 });
  }
}
