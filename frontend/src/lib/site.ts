/**
 * One place that decides the site's own public address.
 *
 * Lives here rather than in app/layout.tsx because Next's App Router
 * rejects arbitrary named exports from a route file — a layout may only
 * export `default`, `metadata`, `viewport` and a fixed set of route
 * config keys, and anything else is a build-time type error.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — an explicit override, e.g. once a real
 *     custom domain replaces the vercel.app one.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — injected by Vercel on every
 *     deployment, so preview builds don't advertise the production
 *     domain in their canonical/OG tags (which would have previews
 *     competing with production in search results).
 *  3. The current production domain, as a last resort for local dev.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://northqu.vercel.app';

/** Absolute URL for a site-relative path — for canonical/OG/JSON-LD. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
