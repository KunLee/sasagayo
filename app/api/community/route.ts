import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getSupabaseConfig,
  setSessionCookies,
} from "@/lib/server/supabase-session";

type ActionBody = {
  action?:
    | "publish-story"
    | "react"
    | "bookmark"
    | "comment"
    | "join-circle"
    | "leave-circle"
    | "update-profile";
  storyId?: string;
  circleId?: string;
  enabled?: boolean;
  title?: string;
  excerpt?: string;
  body?: string;
  category?: string;
  mood?: string;
  trackTitle?: string;
  artistName?: string;
  externalUrl?: string;
  mediaAssetId?: string;
  comment?: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  location?: string;
};

function response(
  body: unknown,
  status: number,
  refreshed?: Parameters<typeof setSessionCookies>[1] | null,
) {
  const result = NextResponse.json(body, { status });
  if (refreshed) setSessionCookies(result, refreshed);
  return result;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function api(path: string, token?: string, init: RequestInit = {}) {
  const { url, publishableKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: publishableKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  try {
    const resource = request.nextUrl.searchParams.get("resource") ?? "stories";
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    let path: string;
    if (resource === "circles")
      path =
        "circles?select=*,circle_members(count)&is_public=eq.true&order=created_at";
    else if (resource === "profiles")
      path = `profiles?select=id,handle,display_name,bio,location,avatar_url&or=(handle.ilike.*${encodeURIComponent(query)}*,display_name.ilike.*${encodeURIComponent(query)}*)&limit=12`;
    else
      path = `stories?select=id,slug,title,excerpt,category,mood,track_title,artist_name,published_at,profiles!stories_author_id_fkey(handle,display_name,location)&status=eq.published&order=published_at.desc.nullslast&limit=24${query ? `&or=(title.ilike.*${encodeURIComponent(query)}*,artist_name.ilike.*${encodeURIComponent(query)}*,track_title.ilike.*${encodeURIComponent(query)}*)` : ""}`;
    const result = await api(path);
    if (!result.ok)
      return response({ error: "Community data could not be loaded." }, 502);
    return response({ items: await result.json() }, 200);
  } catch (error) {
    console.error("Community read failed", error);
    return response({ error: "Community service is unavailable." }, 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin)
      return response({ error: "Invalid request origin." }, 403);
    const auth = await authenticateRequest(request);
    if (!auth) return response({ error: "Authentication required." }, 401);
    const body = (await request.json()) as ActionBody;
    let result: globalThis.Response;

    if (body.action === "publish-story") {
      if (
        !body.title ||
        !body.excerpt ||
        !body.body ||
        !body.trackTitle ||
        !body.artistName
      )
        return response(
          { error: "Complete the story and music details." },
          400,
        );
      const slug = `${slugify(body.title)}-${crypto.randomUUID().slice(0, 7)}`;
      result = await api("stories", auth.accessToken, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          author_id: auth.user.id,
          slug,
          title: body.title,
          excerpt: body.excerpt,
          body: body.body,
          category: body.category ?? "reflection",
          mood: body.mood ?? "reflective",
          track_title: body.trackTitle,
          artist_name: body.artistName,
          external_url: body.externalUrl || null,
          media_asset_id: body.mediaAssetId || null,
          status: "published",
          published_at: new Date().toISOString(),
        }),
      });
      const payload = await result.json();
      if (result.ok && body.mediaAssetId) {
        await api(`media_assets?id=eq.${encodeURIComponent(body.mediaAssetId)}&owner_id=eq.${auth.user.id}`, auth.accessToken, { method: "PATCH", body: JSON.stringify({ visibility: "public" }) });
      }
      return result.ok
        ? response({ story: payload[0] }, 201, auth.refreshedSession)
        : response(
            { error: payload.message ?? "Story could not be published." },
            400,
            auth.refreshedSession,
          );
    }

    if (
      (body.action === "react" || body.action === "bookmark") &&
      body.storyId
    ) {
      const table =
        body.action === "react" ? "story_reactions" : "story_bookmarks";
      result =
        body.enabled === false
          ? await api(
              `${table}?story_id=eq.${body.storyId}&user_id=eq.${auth.user.id}`,
              auth.accessToken,
              { method: "DELETE" },
            )
          : await api(table, auth.accessToken, {
              method: "POST",
              headers: { Prefer: "resolution=merge-duplicates" },
              body: JSON.stringify({
                story_id: body.storyId,
                user_id: auth.user.id,
              }),
            });
      return response(
        { success: result.ok },
        result.ok ? 200 : 400,
        auth.refreshedSession,
      );
    }

    if (body.action === "comment" && body.storyId && body.comment?.trim()) {
      result = await api("comments", auth.accessToken, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          story_id: body.storyId,
          author_id: auth.user.id,
          body: body.comment.trim(),
        }),
      });
      return response(
        result.ok
          ? { comment: (await result.json())[0] }
          : { error: "Comment could not be posted." },
        result.ok ? 201 : 400,
        auth.refreshedSession,
      );
    }

    if (
      (body.action === "join-circle" || body.action === "leave-circle") &&
      body.circleId
    ) {
      result =
        body.action === "leave-circle"
          ? await api(
              `circle_members?circle_id=eq.${body.circleId}&user_id=eq.${auth.user.id}`,
              auth.accessToken,
              { method: "DELETE" },
            )
          : await api("circle_members", auth.accessToken, {
              method: "POST",
              headers: { Prefer: "resolution=merge-duplicates" },
              body: JSON.stringify({
                circle_id: body.circleId,
                user_id: auth.user.id,
              }),
            });
      return response(
        { success: result.ok },
        result.ok ? 200 : 400,
        auth.refreshedSession,
      );
    }

    if (body.action === "update-profile") {
      result = await api(`profiles?id=eq.${auth.user.id}`, auth.accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          handle: body.handle,
          display_name: body.displayName,
          bio: body.bio ?? "",
          location: body.location ?? "",
          updated_at: new Date().toISOString(),
        }),
      });
      return response(
        { success: result.ok },
        result.ok ? 200 : 400,
        auth.refreshedSession,
      );
    }

    return response({ error: "Unknown action." }, 400, auth.refreshedSession);
  } catch (error) {
    console.error("Community action failed", error);
    return response({ error: "Community service is unavailable." }, 503);
  }
}
