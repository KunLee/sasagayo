/**
 * Canonical branding strings for the site.
 *
 * Every user-visible occurrence of the product name and every piece of
 * name-carrying metadata (document title, manifest, Open Graph, Twitter card)
 * reads from here, so a future rename touches this file only.
 *
 * Deliberately NOT covered by these constants: internal identifiers such as the
 * npm package name in package.json, the `site-*` CSS class prefixes and asset
 * file names. Those are not user-visible and renaming them would churn imports
 * and served paths for no benefit.
 */

/** Display name, used for headings, brand text and titles. */
export const SITE_NAME = 'Sasagayo';

/** Short form for tight spaces (manifest short_name, home-screen label). */
export const SITE_SHORT_NAME = 'Sasagayo';

/**
 * Document title pattern for non-root routes. The root page renders
 * `SITE_NAME` on its own; every other route renders `<Page> | Sasagayo`,
 * which is the separator the site already used.
 */
export const SITE_TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

/** Meta description, also reused for og:description and twitter:description. */
export const SITE_DESCRIPTION =
  'Sasagayo is a thoughtful music community for sharing stories, discovering recommendations, and finding people on your frequency.';

/**
 * Brand colour, shared by the icon artwork, theme-color and the manifest.
 * Matches the site's active 'Ember' theme accent (see app/globals.css,
 * `[data-theme="ember"]`).
 */
export const SITE_THEME_COLOR = '#a74735';
