import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { dbConfig } from "@/lib/server/db";
import { currentAccount, reply, rpcAsUser } from "@/lib/server/as-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;
const TYPES: Record<string, { ext: string; magic: (bytes: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { ext: "webp", magic: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
};

/** `.../storage/v1/object/public/avatars/<uid>/<file>` → `<uid>/<file>`. */
function objectPath(url: string | null) {
  return url?.split("/storage/v1/object/public/avatars/")[1] ?? null;
}

async function removeObject(token: string, url: string | null) {
  const path = objectPath(url);
  if (!path) return;
  const { url: base, publishableKey } = dbConfig();
  await fetch(`${base}/storage/v1/object/avatars/${path}`, {
    method: "DELETE",
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

/**
 * Stores a new profile picture. The browser has already cropped and resized
 * it; here we check type, size and file signature, then upload as the user so
 * storage policies confine it to their own folder.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in." }, null, 401);
  const type = request.headers.get("content-type")?.split(";")[0].trim() ?? "";
  const kind = TYPES[type];
  if (!kind) return reply({ error: "Use a JPEG, PNG or WebP picture." }, session.refreshedSession, 415);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return reply({ error: "Pictures must be under 512 KB." }, session.refreshedSession, 413);
  if (!kind.magic(bytes)) return reply({ error: "That file is not a valid picture." }, session.refreshedSession, 415);

  const { url: base, publishableKey } = dbConfig();
  const path = `${session.account.id}/${randomUUID()}.${kind.ext}`;
  const upload = await fetch(`${base}/storage/v1/object/avatars/${path}`, {
    method: "POST",
    headers: { apikey: publishableKey, Authorization: `Bearer ${session.accessToken}`, "Content-Type": type, "Cache-Control": "31536000" },
    body: bytes,
  });
  if (!upload.ok) {
    const detail = await upload.text().catch(() => "");
    console.error("Avatar upload failed", upload.status, detail.slice(0, 200));
    return reply({ error: "The picture could not be stored. Please try again." }, session.refreshedSession, 502);
  }
  const publicUrl = `${base}/storage/v1/object/public/avatars/${path}`;
  try {
    const previous = await rpcAsUser<string | null>(session.accessToken, "set_my_avatar", { p_url: publicUrl });
    await removeObject(session.accessToken, previous);
  } catch (error) {
    await removeObject(session.accessToken, publicUrl);
    return reply({ error: error instanceof Error ? error.message : "Could not save the picture." }, session.refreshedSession, 400);
  }
  return reply({ avatarUrl: publicUrl }, session.refreshedSession);
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in." }, null, 401);
  try {
    const previous = await rpcAsUser<string | null>(session.accessToken, "set_my_avatar", { p_url: null });
    await removeObject(session.accessToken, previous);
    return reply({ avatarUrl: null }, session.refreshedSession);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Could not remove the picture." }, session.refreshedSession, 400);
  }
}
