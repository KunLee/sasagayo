export type Status = "review" | "published" | "rejected" | "hidden";

export type AdminTrack = {
  id: string; title: string; composer_slug: string; composer_name: string; performer: string | null;
  duration_seconds: number; stream_url: string; source_page_url: string; license_name: string;
  quality_score: number; quality_notes: string[]; status: Status; discovered_at: string;
  reviewed_at: string | null; play_count: number;
};

export type Run = {
  id: string; trigger: string; started_at: string; finished_at: string | null; feeds: string[];
  examined: number; published: number; review: number; rejected: number; errors: { feed: string; error: string }[];
};

export type Policy = { mode: "auto" | "manual"; publishAt: number; reviewAt: number; updatedAt: string | null };

export type Overview = {
  totals: Record<Status, number>;
  incoming: Record<Status, number>;
  runs: Run[];
  feeds: { crawled: number; known: number };
  policy: Policy;
};

export async function adminPost<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Action failed.");
  return data as T;
}
