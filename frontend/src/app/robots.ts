import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Serves /robots.txt.
 *
 * The disallow list is a privacy measure as much as an SEO one. Every
 * authenticated route already refuses anonymous access server-side
 * (requireOrgAdmin / requirePlatformAdmin) and middleware gates the
 * prefixes, so nothing here is load-bearing for security — but a crawler
 * that follows a stray link to /dashboard should not be spending crawl
 * budget on a redirect chain, and neither those URLs nor /login should be
 * turning up as search results for the company's own name.
 *
 * `/api/` is listed because those handlers answer with JSON rather than an
 * HTML redirect (a deliberate choice — see middleware.ts), so they are the
 * one authenticated surface that returns a 200-shaped body to a crawler.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/super-admin', '/api/', '/login', '/signup', '/pending'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
