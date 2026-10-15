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
            │                            ≥ 60 published · 40–59 review · < 40 rejected
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
* **Playback** streams directly from the archive (Commons' MP3 transcode, so it
  works on iPhone too). Nothing is copied to R2.
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
| `/admin` | Editor desk: review queue, publish / reject / hide, run discovery, run log |

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

Editors are users with the `admin` role in `public.user_roles` (see
`202608230005_admin_management.sql`).

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
