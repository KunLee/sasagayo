import { NextRequest } from "next/server";
import { mirrorBatch } from "@/lib/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Copies a batch of recordings into R2. Protected like the daily cron; used to
 * work through the backlog (`npm run mirror:backlog`).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const seconds = Math.min(280, Math.max(20, Number(request.nextUrl.searchParams.get("seconds")) || 240));
  try {
    return Response.json({ ok: true, ...(await mirrorBatch(seconds * 1000)) });
  } catch (error) {
    console.error("Mirror run failed", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Mirror failed." }, { status: 500 });
  }
}
