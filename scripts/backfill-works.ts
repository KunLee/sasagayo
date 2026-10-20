// Fills work/movement columns for stored tracks. Dry run unless --apply.
//   node --env-file=.env.local scripts/backfill-works.ts [--apply]
import { workFields } from "../lib/discovery/quality.ts";
import { serviceJson } from "../lib/server/db.ts";

type Row = { id: string; title: string; composer_slug: string; performer: string | null; work_key: string | null; movement_number: number | null };
const apply = process.argv.includes("--apply");
const rows: Row[] = [];
for (let offset = 0; ; offset += 1000) {
  const page = await serviceJson<Row[]>(`tracks?select=id,title,composer_slug,performer,work_key,movement_number&status=neq.rejected&order=id&limit=1000&offset=${offset}`);
  rows.push(...page);
  if (page.length < 1000) break;
}

const changes = rows
  .map((row) => ({ row, fields: workFields(row.composer_slug, row.title, row.performer) }))
  .filter(({ row, fields }) => fields.work_key !== row.work_key || fields.movement_number !== row.movement_number);
console.log(`${rows.length} rows checked, ${changes.length} ${apply ? "updating" : "would change"}`);

if (apply) {
  // Eight requests at a time keeps the run short without hammering PostgREST.
  for (let index = 0; index < changes.length; index += 8) {
    await Promise.all(changes.slice(index, index + 8).map(({ row, fields }) =>
      serviceJson(`tracks?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(fields) })));
  }
  console.log("done");
}
