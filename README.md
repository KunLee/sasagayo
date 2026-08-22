# Sasagayo

Sasagayo is a minimal static web application built with
[Next.js](https://nextjs.org). The project is configured for **static export**:
`next build` pre-renders every route to plain HTML so the site can be served by
any static host (S3, GitHub Pages, Netlify, nginx, …) with no Node.js runtime.

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

Because `next.config.mjs` sets `output: 'export'`, the build writes the static
site to the **`out/`** directory:

```
out/
  index.html          -> /
  about/index.html    -> /about
  logo.svg
  favicon.svg
  site.webmanifest
  _next/...           (hashed JS/CSS assets)
```

Preview it with any static file server pointed at `out/`, for example:

```bash
python3 -m http.server --directory out 3000
```

`npm start` (`next start`) is only useful if the static export is turned off; a
static export is served from `out/` as shown above.

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

To add a page, create `app/<route>/page.jsx` and default-export a React
component; the build emits `out/<route>/index.html` for it automatically.
Export a `metadata` object from the file to set that page's title and
description.

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
