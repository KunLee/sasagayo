# Sasagayo

**Sasagayo** is a minimal static web application built with
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

## Branding

The product name is written down once, in `lib/site.js`. Every user-visible
surface — the document `<title>`, the meta description, the Open Graph and
Twitter tags, `application-name`, `apple-mobile-web-app-title`, the header
brand, the footer and the home page copy — imports it from there, so renaming
the app is a one-line change.

Page titles follow the pattern `"<Page> · Sasagayo"`; the landing page is
titled simply `Sasagayo`.

The site mark is a treble clef:

| Asset             | Used for                                                |
| ----------------- | ------------------------------------------------------- |
| `app/icon.svg`    | the favicon, via Next.js file-based metadata             |
| `public/logo.svg` | the logo displayed on the home page                      |

Both files are original artwork drawn for this repository (plain SVG paths, no
third-party source), dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), so they may be
redistributed with the site. They are single-colour, stroke-based and stay
legible when scaled down to 16×16. Browsers cache favicons aggressively — use a
hard reload or a private window when checking the new icon.

## Project layout

```
app/
  layout.jsx        root layout: <html>/<body>, metadata, Header + Footer
  page.jsx          home page
  about/page.jsx    about page
  globals.css       reset, base typography, layout utilities
  icon.svg          favicon (file-based metadata): treble clef mark
components/
  Header.jsx        site navigation using next/link
  Footer.jsx        site footer
lib/
  site.js           canonical display strings (name, description, title pattern)
public/             static assets served from the site root (e.g. /logo.svg)
next.config.mjs     static export configuration
```

Assets in `public/` are referenced with root-relative paths (`/logo.svg`) so
they keep working after the static export.

## Notes

- `images.unoptimized: true` is required: the default image optimiser needs a
  server at runtime, which a static export does not have.
- `trailingSlash: true` makes routes map to `<route>/index.html`, which is what
  most static hosts expect.
- Generated artefacts (`node_modules/`, `.next/`, `out/`) are git-ignored and
  must not be committed.
