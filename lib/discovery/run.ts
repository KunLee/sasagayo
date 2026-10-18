import { inList, serviceJson } from "../server/db.ts";
import { loadPolicy } from "./policy.ts";
import { evaluate, type PublishPolicy, type TrackDraft } from "./quality.ts";
import { FEEDS, type Feed } from "./sources.ts";

type FeedState = { feed: string; next_offset: number; total_hits: number | null; last_crawled_at: string | null };

export type RunSummary = {
  runId: string;
  feeds: string[];
  examined: number;
  inserted: number;
  published: number;
  review: number;
  rejected: number;
  duplicates: number;
  errors: { feed: string; error: string }[];
  durationMs: number;
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 300);

function orderFeeds(states: FeedState[]) {
  const byFeed = new Map(states.map((state) => [state.feed, state]));
  // Never-crawled feeds first, then the least recently crawled.
  return [...FEEDS].sort((a, b) => {
    const left = byFeed.get(a.id)?.last_crawled_at ?? "";
    const right = byFeed.get(b.id)?.last_crawled_at ?? "";
    return left.localeCompare(right);
  }).map((feed) => ({ feed, state: byFeed.get(feed.id) }));
}

async function storeDrafts(drafts: TrackDraft[]) {
  if (!drafts.length) return { inserted: [] as TrackDraft[], duplicates: 0 };
  const known = await serviceJson<{ source_key: string }[]>(
    `tracks?select=source_key&source_key=in.${encodeURIComponent(inList(drafts.map((draft) => draft.source_key)))}`,
  );
  const knownKeys = new Set(known.map((row) => row.source_key));
  const fresh = drafts.filter((draft) => !knownKeys.has(draft.source_key));
  if (!fresh.length) return { inserted: [], duplicates: 0 };

  // The same performance is often uploaded twice (WAV + OGG). Keep the first.
  const keys = [...new Set(fresh.filter((draft) => draft.status !== "rejected").map((draft) => draft.dedupe_key))];
  const taken = new Set(keys.length
    ? (await serviceJson<{ dedupe_key: string }[]>(
      `tracks?select=dedupe_key&status=in.(published,review)&dedupe_key=in.${encodeURIComponent(inList(keys))}`,
    )).map((row) => row.dedupe_key)
    : []);
  let duplicates = 0;
  const rows = fresh.map((draft) => {
    if (draft.status === "rejected") return draft;
    if (taken.has(draft.dedupe_key)) {
      duplicates += 1;
      return { ...draft, status: "rejected" as const, quality_notes: [...draft.quality_notes, "duplicate of a stored recording"] };
    }
    taken.add(draft.dedupe_key);
    return draft;
  }).map((draft) => ({ ...draft, published_at: draft.status === "published" ? new Date().toISOString() : null }));

  await serviceJson("tracks?on_conflict=source_key", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return { inserted: rows, duplicates };
}

async function crawlFeed(feed: Feed, state: FeedState | undefined, policy: PublishPolicy) {
  const offset = state?.next_offset ?? 0;
  const page = await feed.fetch(offset);
  const drafts = page.items.map((item) => evaluate(item, policy)).filter((draft): draft is TrackDraft => draft !== null);
  const stored = await storeDrafts(drafts);
  await serviceJson("discovery_state?on_conflict=feed", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    // When a feed is exhausted it starts again from the top, picking up new uploads.
    body: JSON.stringify({ feed: feed.id, next_offset: page.nextOffset ?? 0, total_hits: page.total, last_crawled_at: new Date().toISOString() }),
  });
  return { examined: page.items.length, ...stored };
}

/**
 * Crawls as many feeds as fit in the time budget. Every feed page is committed
 * on its own, so a run cut short by the platform loses at most one page.
 */
export async function runDiscovery(options: { trigger: string; budgetMs: number; feedIds?: string[] }): Promise<RunSummary> {
  const startedAt = Date.now();
  const [run] = await serviceJson<{ id: string }[]>("discovery_runs?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ trigger: options.trigger }),
  });
  const summary: RunSummary = { runId: run.id, feeds: [], examined: 0, inserted: 0, published: 0, review: 0, rejected: 0, duplicates: 0, errors: [], durationMs: 0 };

  const [states, policy] = await Promise.all([serviceJson<FeedState[]>("discovery_state?select=*"), loadPolicy()]);
  const queue = orderFeeds(states).filter(({ feed }) => !options.feedIds || options.feedIds.includes(feed.id));
  // Feeds run two at a time; Commons asks clients to keep concurrency low.
  const PAGE_COST_MS = 9_000;
  while (queue.length && Date.now() - startedAt + PAGE_COST_MS < options.budgetMs) {
    const batch = queue.splice(0, 2);
    const results = await Promise.allSettled(batch.map(({ feed, state }) => crawlFeed(feed, state, policy)));
    results.forEach((result, index) => {
      const feed = batch[index].feed;
      summary.feeds.push(feed.id);
      if (result.status === "rejected") {
        summary.errors.push({ feed: feed.id, error: message(result.reason) });
        return;
      }
      summary.examined += result.value.examined;
      summary.inserted += result.value.inserted.length;
      summary.duplicates += result.value.duplicates;
      for (const row of result.value.inserted) summary[row.status === "published" ? "published" : row.status === "review" ? "review" : "rejected"] += 1;
    });
  }

  summary.durationMs = Date.now() - startedAt;
  await serviceJson(`discovery_runs?id=eq.${run.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      finished_at: new Date().toISOString(), feeds: summary.feeds, examined: summary.examined,
      published: summary.published, review: summary.review, rejected: summary.rejected, errors: summary.errors,
    }),
  }).catch(() => undefined);
  return summary;
}
