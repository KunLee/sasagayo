import { NextRequest } from "next/server";
import { currentAccount, reply, rpcAsUser } from "@/lib/server/as-user";

export const dynamic = "force-dynamic";

/** A signed-in listener reports a public profile to the editors. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in to report a profile." }, null, 401);
  const { handle, reason } = (await request.json().catch(() => ({}))) as { handle?: string; reason?: string };
  try {
    await rpcAsUser(session.accessToken, "report_profile", { p_handle: handle ?? "", p_reason: (reason ?? "").slice(0, 500) });
    return reply({ ok: true }, session.refreshedSession);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Could not send the report." }, session.refreshedSession, 400);
  }
}
