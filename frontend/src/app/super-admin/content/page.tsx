import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getBlogPosts } from '@/lib/queries';
import { ContentManager } from '@/components/ContentManager';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  await requirePlatformAdmin();
  const supabase = createClient();
  const posts = await getBlogPosts(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-black dark:text-white">Content</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          AI-drafted blog posts for NorthQu's own /insights page. Internal tool — not client-facing.
        </p>
      </div>
      <ContentManager initialPosts={posts} />
    </div>
  );
}
