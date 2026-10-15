import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { runDiscovery } from "@/lib/discovery/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily discovery. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const budgetSeconds = Number(process.env.DISCOVERY_BUDGET_SECONDS ?? 50);
  try {
    const summary = await runDiscovery({
      trigger: "cron",
      budgetMs: Math.min(280, Math.max(20, budgetSeconds)) * 1000,
    });
    if (summary.published) revalidateTag("tracks", "max");
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Discovery run failed", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Discovery failed." }, { status: 500 });
  }
}
