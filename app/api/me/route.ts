import { NextRequest } from "next/server";
import { COMPOSER_BY_SLUG } from "@/lib/composers";
import { currentAccount, reply, rpcAsUser, type Account } from "@/lib/server/as-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await currentAccount(request).catch(() => null);
  return reply({ account: session?.account ?? null }, session?.refreshedSession);
}

type ProfileBody = {
  handle?: string;
  displayName?: string;
  motto?: string;
  bio?: string;
  favoriteComposers?: unknown;
  libraryPublic?: boolean;
};

/** Saves the caller's public profile. Missing fields keep their current values. */
export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid origin." }, null, 403);
  const session = await currentAccount(request);
  if (!session) return reply({ error: "Please sign in." }, null, 401);
  const body = (await request.json().catch(() => ({}))) as ProfileBody;
  const current = session.account;
  const favourites = Array.isArray(body.favoriteComposers)
    ? body.favoriteComposers.filter((slug): slug is string => typeof slug === "string" && COMPOSER_BY_SLUG.has(slug)).slice(0, 5)
    : current.favoriteComposers;
  try {
    const account = await rpcAsUser<Account>(session.accessToken, "set_my_profile", {
      p_handle: body.handle ?? current.handle,
      p_display_name: body.displayName ?? current.displayName,
      p_motto: body.motto ?? current.motto,
      p_bio: body.bio ?? current.bio,
      p_favorite_composers: favourites,
      p_library_public: body.libraryPublic ?? current.libraryPublic,
    });
    return reply({ account }, session.refreshedSession);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Could not save." }, session.refreshedSession, 400);
  }
}
