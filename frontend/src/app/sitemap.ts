import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { getPublishedBlogPosts } from '@/lib/queries';

/**
 * Serves /sitemap.xml.
 *
 * Static marketing routes are listed literally rather than derived from the
 * filesystem: a route existing is not the same as it being worth
 * indexing, and this file is the place that decision gets made
 * deliberately. Authenticated routes are absent for the same reasons
 * robots.ts disallows them.
 *
 * Published blog posts are appended from the database, so a post becomes
 * discoverable the moment it is published rather than at the next deploy.
 * A failure there degrades to the static list instead of a 500 — an
 * unreachable sitemap is worse for indexing than a slightly stale one, and
 * this route is public and uncached, so it must not be a way to surface a
 * database error to the open internet.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/services`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/services/leadpulse`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/services/automation`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/services/ai-content`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/services/web-services`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/services/crm`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/insights`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const supabase = createClient();
    const posts = await getPublishedBlogPosts(supabase);
    return [
      ...staticRoutes,
      ...posts.map((post) => ({
        url: `${SITE_URL}/insights/${post.slug}`,
        lastModified: post.published_at ? new Date(post.published_at) : undefined,
        changeFrequency: 'yearly' as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
