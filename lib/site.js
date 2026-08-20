/**
 * Canonical, user-visible display strings for the site.
 *
 * The product name is written down here once. Every user-visible surface
 * (document metadata, social tags, header, footer, page copy) imports it from
 * this module, so a future rename is a one-line change and cannot drift
 * between the tab title and the page itself.
 *
 * Internal identifiers (the npm package name, module paths, CSS classes) are
 * deliberately *not* derived from these constants: they are not user visible.
 */

/** Full, user-visible product name. */
export const SITE_NAME = 'Sasagayo';

/** Short name, used where space is tight (home-screen labels, compact chrome). */
export const SITE_SHORT_NAME = 'Sasagayo';

/** One-line description used for <meta name="description"> and social cards. */
export const SITE_DESCRIPTION = `${SITE_NAME} is a minimal static web application built with Next.js and the App Router.`;

/**
 * Page-title pattern for sub-pages: "<Page> · Sasagayo".
 * The landing page uses the bare product name (see app/layout.jsx).
 */
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;
