import { AwsClient } from "aws4fetch";

/** Cloudflare R2 through its S3-compatible API. */
export function r2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const objectUrl = (key: string) => `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return {
    async put(key: string, body: ArrayBuffer, contentType: string) {
      const bytes = new Uint8Array(body);
      // Sign first, then send with an explicit length: some runtimes (Vercel's)
      // otherwise stream the body chunked, which R2 rejects with 411.
      const signed = await client.sign(objectUrl(key), {
        method: "PUT",
        body: bytes,
        headers: { "Content-Type": contentType, "Content-Length": String(bytes.byteLength), "Cache-Control": "public, max-age=31536000, immutable" },
      });
      const response = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body: bytes,
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`R2 upload failed with ${response.status}: ${(await response.text()).slice(0, 200)}`);
    },
    async remove(key: string) {
      await client.fetch(objectUrl(key), { method: "DELETE" });
    },
    /**
     * A link the browser can stream from. Uses R2_PUBLIC_BASE (a public
     * bucket or custom domain) when configured, otherwise a signed URL.
     */
    async playableUrl(key: string, expiresSeconds = 6 * 3600) {
      const publicBase = process.env.R2_PUBLIC_BASE?.replace(/\/$/, "");
      if (publicBase) return `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
      const url = new URL(objectUrl(key));
      url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
      const signed = await client.sign(url.toString(), { method: "GET", aws: { signQuery: true } });
      return signed.url;
    },
  };
}
