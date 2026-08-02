import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPublishedBlogPosts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

function excerpt(content: string, max = 180): string {
  const plain = content.replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max).trim()}…` : plain;
}

export default async function InsightsPage() {
  const supabase = createClient();
  const posts = await getPublishedBlogPosts(supabase);

  if (posts.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-6 py-32 text-center">
        <h1 className="font-marketingDisplay text-5xl text-black dark:text-white sm:text-6xl">
          Insights
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          We&rsquo;re working on articles and updates about the systems we build. Check back soon.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-marketingDisplay text-5xl text-black dark:text-white sm:text-6xl">
        Insights
      </h1>
      <p className="mt-5 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        Notes on the systems we build, and what we learn building them.
      </p>

      <div className="mt-16 space-y-10">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/insights/${post.slug}`}
            className="block border-t border-neutral-200 pt-8 first:border-t-0 first:pt-0 dark:border-neutral-800"
          >
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </p>
            <h2 className="mt-2 font-marketingDisplay text-2xl text-black transition-colors hover:text-cinnamon-600 dark:text-white dark:hover:text-cinnamon-400">
              {post.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              {excerpt(post.content)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
