# Sasagayo

An open library of great classical recordings. Every day Sasagayo crawls public
archives composer by composer, judges each audio file, and publishes the real,
well-credited, openly licensed performances. Anyone can listen, save favourites,
and share a recording or a whole mix with one link — no account needed.

## How it works

```
Vercel Cron (daily 19:00 UTC)
  └─ GET /api/cron/discover            (Bearer CRON_SECRET)
       └─ lib/discovery/run.ts         picks the least-recently crawled feeds
            ├─ sources.ts              Wikimedia Commons deepcat:"Audio files of music by …" per composer,
            │                          Internet Archive Musopen items with an explicit licence
            ├─ quality.ts              normalise title / performer / licence, score 0–100
            ├─ policy.ts               editor-set rules from `site_settings`:
            │                            automatic: ≥ publish_at published · ≥ review_at review · else rejected
            │                            manual:    ≥ review_at review · else rejected (nothing goes live unreviewed)
            └─ Supabase `tracks`       one row per file; rejected rows are kept so they are never re-judged
```

* **Feeds** (`lib/composers.ts`): 67 composers, each mapped to its Commons
  category. A per-feed cursor in `discovery_state` means each run continues where
  the last stopped, and exhausted feeds start again to pick up new uploads.
* **Quality rules** (`lib/discovery/quality.ts`, tested in `quality.test.ts`):
  hard-rejects MIDI and synthesised renderings, spoken word, bar-number excerpts,
  remixes, library arrangements, stems, files under 60 s, and NC/ND licences;
  rewards credited performers, full-length works, recognisable work titles,
  curated collections (Musopen, European Archive, Featured sounds).
* **Playback** goes through `/api/play/<id>`: our own copy in Cloudflare R2 when
  we have one (signed URL, or `R2_PUBLIC_BASE` if a public domain is attached to
  the bucket), otherwise the archive's MP3. The daily cron spends leftover time
  copying published recordings into R2, most-played first;
  `npm run mirror:backlog` works through the backlog on the deployed server.
* **Historical recordings** (`historical:<composer>` feeds): Internet Archive's
  Great 78 Project sides recorded **before 1926**, which are public domain in the
  US, Australia, China and the EU. A known year is required; sides become works
  ("Part 1/2"), reissue duplicates collapse, dance-band versions are skipped.
* **Search** (`lib/catalog.ts`, `lib/search-tokens.ts`) matches every word against
  an accent-folded `search_text` (trigram-indexed). Chinese queries are segmented
  — `肖邦 夜曲` finds Chopin nocturnes.

## Pages

| Route | |
| --- | --- |
| `/` | Hero search, today's programme (daily seed), composers, just added, eras |
| `/composers`, `/composers/[slug]` | By era; portrait and bio from Wikipedia; best recordings first |
| `/search?q=` | Full results, paginated |
| `/track/[id]?t=90` | Recording page; `t` starts playback at a moment; OG image for link previews |
| `/library` | Saved recordings (browser storage), reorder, share as a mix link |
| `/mix?n=…&t=id,id` | A shared mix; recipients can play or save it |
| `/signup`, `/signin`, `/forgot-password`, `/reset-password`, `/account` | Listener accounts (Supabase Auth, HTTP-only cookies) |
| `/admin` | Editor desk: incoming (24 h), review queue, all music with filters and bulk decisions; publishing mode and thresholds; users (editor role, suspension); discovery runs |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys and CRON_SECRET
npx supabase db push         # applies supabase/migrations
npm run discover -- --minutes 5   # optional: fill the library before the first cron run
npm run dev
```

Environment (also set in Vercel):

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Public reads, sign-in |
| `SUPABASE_SECRET_KEY` | Discovery writes and editor actions (server only) |
| `CRON_SECRET` | Protects `/api/cron/discover` |
| `APP_ORIGIN` | Canonical site URL for share links and metadata |
| `DISCOVERY_BUDGET_SECONDS` | Optional; seconds each cron run may crawl (default 50) |

Editors are users with the `admin` role in `public.user_roles`; existing editors
can grant the role from **Editor desk → Users**. Editor decisions are stored in
`tracks.reviewed_by` and are never overridden when rules are re-applied.

Listener libraries live in `library_items` (row-level security: owner only) and
are written through `set_my_library()`. Signed-out visitors keep a browser-only
library that is merged into their account on first sign-in.

Supabase Auth settings to check in the dashboard (Authentication → URL
Configuration): add `https://sasagayo.kumind.com.au/**` to **Redirect URLs** so
confirmation and password-reset emails return to the site. The built-in email
sender is heavily rate-limited; configure custom SMTP before inviting many users.

## Checks

```bash
npm run test:quality   # discovery rules against real-world junk and real performances
npm run typecheck
npm run lint
npm run build
```

## Legacy data

`catalog_tracks`, `music_source_candidates`, and the R2 bucket from the previous
importer are left untouched and are no longer read. They can be dropped once the
new library has been checked.
