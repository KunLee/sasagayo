# Sasagayo

Sasagayo is a music and story community built with
[Next.js](https://nextjs.org). Pages are pre-rendered where possible, while
authentication uses a same-origin Vercel Function so Supabase session tokens
can remain in HTTP-only cookies.

## Prerequisites

- Node.js 18.17 or newer
- npm (ships with Node.js)

## Install

```bash
npm install
```

## Local development

```bash
npm run dev
```

Then open <http://localhost:3000>. The home page (`/`) and the about page
(`/about`) are linked from the header, so navigation between routes can be
checked immediately. Edits are hot-reloaded.

## Production build

```bash
npm run build
```

The application now uses a standard Next.js production build because API
routes require a server runtime. Preview it with `npm start`, or deploy the
repository directly to Vercel.

Copy `.env.example` to `.env.local` and set the Supabase publishable key. Add
the same `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` variables to Vercel for
Preview and Production deployments.

`GET /api/auth` returns the current user. `POST /api/auth` accepts an `action`
of `login`, `refresh`, or `logout`. The access and refresh tokens remain in
secure, HTTP-only cookies and are not returned to browser JavaScript.

`POST /api/media` creates authenticated, ten-minute R2 upload and download
URLs. It also completes and deletes uploads. Media metadata is protected by
Supabase RLS in `public.media_assets`; owners manage their own records, while
ready public records may be read by signed-in users.

The R2 bucket needs a CORS rule allowing `GET`, `HEAD`, and `PUT` from the web
application. An R2 Admin Read & Write token can apply the checked-in rule with
`npm run r2:configure-cors`.

## Linting

```bash
npm run lint
```

## Routing convention

This project uses the **App Router**. Each route is a folder under `app/`
containing a `page.jsx`:

| Route    | File                 |
| -------- | -------------------- |
| `/`      | `app/page.jsx`       |
| `/about` | `app/about/page.jsx` |

To add a page, create `app/<route>/page.tsx` and default-export a React
component. Export a `metadata` object from the file to set that page's title
and description.

## Project layout

```
app/
  layout.jsx        root layout: <html>/<body>, metadata, Header + Footer
  page.jsx          home page
  about/page.jsx    about page
  globals.css       reset, base typography, layout utilities
  icon.svg          favicon (file-based metadata)
components/
  Header.jsx        site navigation using next/link
  Footer.jsx        site footer
lib/
  site.js           canonical branding strings (name, title template, …)
public/             static assets served from the site root (e.g. /logo.svg)
  favicon.svg       vector icon referenced by the web app manifest
  logo.svg          large version of the mark, used on the home page
  site.webmanifest  web app manifest (name, short_name, icons, theme colour)
next.config.mjs     static export configuration
```

Assets in `public/` are referenced with root-relative paths (`/logo.svg`) so
they keep working after the static export.

## Branding

All user-visible occurrences of the product name come from `lib/site.js`:

| Constant              | Value                            | Used for                                     |
| --------------------- | -------------------------------- | -------------------------------------------- |
| `SITE_NAME`           | `Sasagayo`                       | header brand, footer, home heading, og/twitter |
| `SITE_SHORT_NAME`     | `Sasagayo`                       | manifest short name / home-screen label       |
| `SITE_TITLE_TEMPLATE` | `%s \| Sasagayo`                 | document title on non-root routes             |
| `SITE_DESCRIPTION`    | see file                         | meta description, og/twitter description      |
| `SITE_THEME_COLOR`    | `#16191d`                        | `theme-color`, manifest, icon artwork         |

The root page renders the title `Sasagayo`; every other route renders
`<Page> | Sasagayo`. Change the constants and every surface follows.

The manifest (`public/site.webmanifest`) repeats `name`, `short_name` and
`description` because a manifest is a static JSON document and cannot import
from `lib/site.js` — keep it in sync when the constants change.

Internal identifiers were intentionally **not** renamed, because nothing
user-visible depends on them and changing them would churn imports, served
paths or published metadata for no benefit:

- the npm package identifier `static-web-app` in `package.json` (only the
  human-readable `description` was updated). Renaming it can be a separate
  follow-up;
- the `site-*` CSS class prefixes in `app/globals.css`;
- asset file names (`logo.svg`, `favicon.svg`, `icon.svg`).

## Brand assets

`app/icon.svg`, `public/favicon.svg` and `public/logo.svg` all draw the same
mark: a pair of beamed quavers (eighth notes) in white on the dark brand
square — a classical-music reference that stays readable at 16×16 and keeps
enough contrast against both light and dark browser chrome.

Provenance: the artwork is original to this repository. It is hand-written SVG
(three `path` elements and two `ellipse` elements, no traced or imported
third-party file), so there is no external license to honour; it is covered by
this repository's own terms.

The assets are vector only. Raster variants (`favicon.ico`,
`apple-touch-icon.png`, 192×192/512×512 PWA icons) are not committed: modern
browsers accept the SVG favicon and the manifest declares it with
`"sizes": "any"`. If raster fallbacks are needed later, generate them from
`public/favicon.svg` and add them next to it plus to the manifest `icons`
array.

## Notes

- `images.unoptimized: true` is required: the default image optimiser needs a
  server at runtime, which a static export does not have.
- `trailingSlash: true` makes routes map to `<route>/index.html`, which is what
  most static hosts expect.
- Generated artefacts (`node_modules/`, `.next/`, `out/`) are git-ignored and
  must not be committed.
- Browsers cache favicons aggressively; hard-refresh (or open a private window)
  when checking the icon after a change.
