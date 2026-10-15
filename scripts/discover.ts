// Runs discovery from the command line, e.g. to fill a fresh library quickly:
//   npm run discover -- --minutes 10
//   npm run discover -- --feed commons:chopin
// Reads SUPABASE_* from .env.local and writes to that database.
import { runDiscovery } from "../lib/discovery/run.ts";

const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const minutes = Number(option("minutes") ?? 1);
const feed = option("feed");
const deadline = Date.now() + minutes * 60_000;
const total = { examined: 0, published: 0, review: 0, rejected: 0, duplicates: 0 };

do {
  const summary = await runDiscovery({
    trigger: "cli",
    budgetMs: Math.min(120_000, Math.max(15_000, deadline - Date.now())),
    feedIds: feed ? [feed] : undefined,
  });
  for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += summary[key];
  console.log(
    `${summary.feeds.length} feeds · ${summary.examined} examined · ${summary.published} published · ` +
      `${summary.review} review · ${summary.rejected} rejected` +
      (summary.errors.length ? ` · errors: ${summary.errors.map((error) => `${error.feed}: ${error.error}`).join("; ")}` : ""),
  );
  if (feed) break;
} while (Date.now() < deadline - 15_000);

console.log("Total", total);
