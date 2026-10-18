import { NextRequest } from "next/server";
import { currentAccount, reply, rpcAsUser } from "@/lib/server/as-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await currentAccount(request).catch(() => null);
  return reply({ account: session?.account ?? null }, session?.refreshedSession);
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in." }, null, 401);
  const { displayName } = (await request.json().catch(() => ({}))) as { displayName?: string };
  try {
    await rpcAsUser(session.accessToken, "set_my_display_name", { p_name: displayName ?? "" });
    return reply({ account: { ...session.account, displayName: (displayName ?? "").trim() } }, session.refreshedSession);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Could not save." }, session.refreshedSession, 400);
  }
}
