import { serviceJson } from "../server/db.ts";
import { DEFAULT_POLICY, type PublishPolicy } from "./quality.ts";

type SettingsRow = { publish_mode: "auto" | "manual"; publish_at: number; review_at: number; updated_at: string };

export async function loadPolicy(): Promise<PublishPolicy & { updatedAt: string | null }> {
  try {
    const [row] = await serviceJson<SettingsRow[]>("site_settings?select=publish_mode,publish_at,review_at,updated_at&limit=1");
    if (!row) return { ...DEFAULT_POLICY, updatedAt: null };
    return { mode: row.publish_mode, publishAt: row.publish_at, reviewAt: row.review_at, updatedAt: row.updated_at };
  } catch {
    return { ...DEFAULT_POLICY, updatedAt: null };
  }
}

export async function savePolicy(policy: PublishPolicy, editorId: string) {
  await serviceJson("site_settings?id=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      publish_mode: policy.mode, publish_at: policy.publishAt, review_at: policy.reviewAt,
      updated_at: new Date().toISOString(), updated_by: editorId,
    }),
  });
}

/**
 * Applies the current policy to recordings no editor has decided on yet:
 * review → published when they clear the bar (auto mode), and rejected →
 * review when a lower review threshold now admits them. Duplicates stay out.
 */
export async function applyPolicyToQueue(policy: PublishPolicy) {
  const now = new Date().toISOString();
  const undecided = "reviewed_by=is.null";
  const notDuplicate = `quality_notes=not.cs.${encodeURIComponent('{"duplicate of a stored recording"}')}`;
  const patch = (filter: string, body: Record<string, unknown>) =>
    serviceJson<{ id: string }[]>(`tracks?${filter}&select=id`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...body, updated_at: now }),
    });

  const published = policy.mode === "auto"
    ? await patch(`status=eq.review&${undecided}&quality_score=gte.${policy.publishAt}`, { status: "published", published_at: now })
    : [];
  const promoted = await patch(
    `status=eq.rejected&${undecided}&${notDuplicate}&quality_score=gte.${policy.reviewAt}`,
    { status: "review" },
  );
  return { published: published.length, toReview: promoted.length };
}
