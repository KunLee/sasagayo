// Re-applies the current title/performer parser to stored tracks and patches
// only rows whose values change. Dry run by default; pass --apply to write.
//   node --env-file=.env.local scripts/repair-metadata.ts [--apply]
import { COMPOSER_BY_SLUG } from "../lib/composers.ts";
import { buildSearchText, cleanPerson, dedupeKey, parseTitle } from "../lib/discovery/quality.ts";
import { serviceJson } from "../lib/server/db.ts";

type Row = { id: string; title: string; performer: string | null; composer_slug: string; description: string; attribution: string };
const apply = process.argv.includes("--apply");
const rows: Row[] = [];
for (let offset = 0; ; offset += 1000) {
  const page = await serviceJson<Row[]>(`tracks?select=id,title,performer,composer_slug,description,attribution&order=id&limit=1000&offset=${offset}`);
  rows.push(...page);
  if (page.length < 1000) break;
}

let changed = 0;
for (const row of rows) {
  const composer = COMPOSER_BY_SLUG.get(row.composer_slug) ?? null;
  // Only touch rows whose performer is missing or junk; re-parsing clean titles would strip nicknames.
  if (row.performer && cleanPerson(row.performer, composer) === row.performer) continue;
  const endsWithPlayer = /[-–]\s*[\p{Lu}][\p{L}.' ]{2,60}?,? (?:(?:on|at the) )?(?:piano|violin|cello|organ|guitar|harpsichord|flute|soprano|tenor)$/u.test(row.title);
  const reparsed = endsWithPlayer ? parseTitle(row.title, composer) : null;
  const parsed = reparsed?.performer ? reparsed : { title: row.title, performer: null };
  const performer = (parsed.performer && cleanPerson(parsed.performer, composer)) ?? (row.performer ? cleanPerson(row.performer, composer) : null);
  if (parsed.title === row.title && performer === row.performer) continue;
  changed += 1;
  const attribution = row.performer && row.attribution.startsWith(`Performed by ${row.performer}`)
    ? row.attribution.replace(`Performed by ${row.performer}`, performer ? `Performed by ${performer}` : "").replace(/^ · /, "")
    : performer ? `Performed by ${performer} · ${row.attribution}` : row.attribution;
  if (changed <= 15) console.log(`${row.title} | ${row.performer}  →  ${parsed.title} | ${performer}`);
  if (apply) {
    await serviceJson(`tracks?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        title: parsed.title, performer, attribution,
        dedupe_key: dedupeKey(row.composer_slug, parsed.title, performer),
        search_text: buildSearchText(parsed.title, composer, performer, row.description),
        updated_at: new Date().toISOString(),
      }),
    });
  }
}
console.log(`${rows.length} rows checked, ${changed} ${apply ? "updated" : "would change"}`);
