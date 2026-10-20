import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { runDiscovery } from "@/lib/discovery/run";
import { serviceJson } from "@/lib/server/db";

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
    // Roll finished days into daily totals and drop raw events older than 90 days.
    const analytics = await serviceJson("rpc/analytics_maintenance", { method: "POST", body: "{}" }).catch((error) => ({ error: String(error) }));
    return Response.json({ ok: true, ...summary, analytics });
  } catch (error) {
    console.error("Discovery run failed", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Discovery failed." }, { status: 500 });
  }
}
