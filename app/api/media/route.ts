import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getR2Config } from "@/lib/server/r2";
import {
  authenticateRequest,
  getSupabaseConfig,
  setSessionCookies,
} from "@/lib/server/supabase-session";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const URL_LIFETIME_SECONDS = 10 * 60;
const ALLOWED_TYPES = /^(audio|image)\/[a-z0-9.+-]+$/i;

type MediaRequest = {
  action?: "create-upload" | "complete-upload" | "create-download" | "delete";
  assetId?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  visibility?: "private" | "public";
};

function json(
  body: unknown,
  status: number,
  refreshedSession?: Parameters<typeof setSessionCookies>[1] | null,
) {
  const response = NextResponse.json(body, { status });
  if (refreshedSession) setSessionCookies(response, refreshedSession);
  return response;
}

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "media";
}

async function dataApi(
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return json({ error: "Invalid request origin." }, 403);
    }

    const auth = await authenticateRequest(request);
    if (!auth) return json({ error: "Authentication required." }, 401);
    const body = (await request.json()) as MediaRequest;
    const { client, bucket } = getR2Config();

    if (body.action === "create-upload") {
      if (
        !body.fileName ||
        !body.contentType ||
        !ALLOWED_TYPES.test(body.contentType) ||
        !Number.isSafeInteger(body.size) ||
        !body.size ||
        body.size > MAX_FILE_SIZE
      ) {
        return json(
          { error: "A valid audio/image file up to 200 MB is required." },
          400,
          auth.refreshedSession,
        );
      }

      const assetId = crypto.randomUUID();
      const objectKey = `users/${auth.user.id}/${assetId}-${safeFileName(body.fileName)}`;
      const insertResponse = await dataApi("media_assets", auth.accessToken, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: assetId,
          owner_id: auth.user.id,
          object_key: objectKey,
          file_name: body.fileName,
          mime_type: body.contentType,
          size_bytes: body.size,
          visibility: body.visibility ?? "private",
        }),
      });
      if (!insertResponse.ok) {
        console.error("Could not create media metadata", await insertResponse.text());
        return json({ error: "Could not create media record." }, 502);
      }

      try {
        const uploadUrl = await getSignedUrl(
          client,
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ContentType: body.contentType,
          }),
          { expiresIn: URL_LIFETIME_SECONDS },
        );
        return json(
          { assetId, uploadUrl, expiresIn: URL_LIFETIME_SECONDS },
          201,
          auth.refreshedSession,
        );
      } catch (error) {
        await dataApi(`media_assets?id=eq.${assetId}`, auth.accessToken, {
          method: "DELETE",
        });
        throw error;
      }
    }

    if (!body.assetId) return json({ error: "assetId is required." }, 400);
    const assetResponse = await dataApi(
      `media_assets?id=eq.${encodeURIComponent(body.assetId)}&select=*`,
      auth.accessToken,
    );
    const assets = assetResponse.ok ? await assetResponse.json() : [];
    const asset = assets[0] as
      | { owner_id: string; object_key: string; mime_type: string; file_name: string }
      | undefined;
    if (!asset) return json({ error: "Media asset not found." }, 404);

    if (body.action === "complete-upload") {
      if (asset.owner_id !== auth.user.id) {
        return json({ error: "Only the owner can complete this upload." }, 403);
      }
      const object = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: asset.object_key }),
      );
      if (!object.ContentLength || object.ContentLength > MAX_FILE_SIZE) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.object_key }));
        await dataApi(`media_assets?id=eq.${encodeURIComponent(body.assetId)}`, auth.accessToken, {
          method: "DELETE",
        });
        return json({ error: "The uploaded file has an invalid size." }, 400);
      }
      await dataApi(`media_assets?id=eq.${encodeURIComponent(body.assetId)}`, auth.accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          status: "ready",
          uploaded_at: new Date().toISOString(),
          size_bytes: object.ContentLength,
        }),
      });
      return json({ success: true }, 200, auth.refreshedSession);
    }

    if (body.action === "create-download") {
      const downloadUrl = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: asset.object_key,
          ResponseContentType: asset.mime_type,
          ResponseContentDisposition: `attachment; filename="${safeFileName(asset.file_name)}"`,
        }),
        { expiresIn: URL_LIFETIME_SECONDS },
      );
      return json(
        { downloadUrl, expiresIn: URL_LIFETIME_SECONDS },
        200,
        auth.refreshedSession,
      );
    }

    if (body.action === "delete") {
      if (asset.owner_id !== auth.user.id) {
        return json({ error: "Only the owner can delete this media." }, 403);
      }
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.object_key }));
      const deleteResponse = await dataApi(
        `media_assets?id=eq.${encodeURIComponent(body.assetId)}`,
        auth.accessToken,
        { method: "DELETE" },
      );
      if (!deleteResponse.ok) return json({ error: "Could not delete media record." }, 502);
      return json({ success: true }, 200, auth.refreshedSession);
    }

    return json({ error: "Unknown action." }, 400, auth.refreshedSession);
  } catch (error) {
    console.error("Media request failed", error);
    return json({ error: "Media service is unavailable." }, 503);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) return json({ error: "Authentication required." }, 401);
    const response = await dataApi(
      `media_assets?owner_id=eq.${auth.user.id}&select=id,file_name,mime_type,size_bytes,visibility,status,uploaded_at,created_at&order=created_at.desc`,
      auth.accessToken,
    );
    if (!response.ok) {
      console.error("Could not list media", await response.text());
      return json({ error: "Could not load media." }, 502, auth.refreshedSession);
    }
    return json({ assets: await response.json() }, 200, auth.refreshedSession);
  } catch (error) {
    console.error("Media list failed", error);
    return json({ error: "Media service is unavailable." }, 503);
  }
}
