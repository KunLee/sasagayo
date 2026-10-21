// Works through the R2 copy backlog by calling the deployed mirror endpoint
// until nothing is left. The copying happens on the server, not this machine.
//   node --env-file=.env.local scripts/mirror-backlog.mjs [origin]
const origin = (process.argv[2] ?? process.env.APP_ORIGIN ?? "https://sasagayo.kumind.com.au").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("CRON_SECRET is not set.");

let totalCopied = 0;
let totalBytes = 0;
for (let round = 1; round <= 200; round += 1) {
  const response = await fetch(`${origin}/api/cron/mirror?seconds=240`, { headers: { Authorization: `Bearer ${secret}` } });
  const result = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
  if (!result.ok) {
    console.error(`round ${round}: ${result.error}`);
    break;
  }
  totalCopied += result.copied;
  totalBytes += result.bytes;
  console.log(`round ${round}: copied ${result.copied}, failed ${result.failed}, ${(result.bytes / 1048576).toFixed(0)} MB — ${result.remaining} left`);
  if (result.errors?.length) console.log(`  e.g. ${result.errors[0]}`);
  if (!result.remaining || (result.copied === 0 && result.failed === 0)) break;
}
console.log(`done: ${totalCopied} copied, ${(totalBytes / 1073741824).toFixed(2)} GB`);
