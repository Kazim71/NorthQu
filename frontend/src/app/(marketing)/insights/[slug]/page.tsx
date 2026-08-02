import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBlogPostBySlug } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * Renders content as plain text with line breaks preserved, not a
 * markdown-to-HTML pipeline — no markdown renderer dependency exists in
 * this project yet, and adding one for a single internal-content page
 * isn't worth it. Posts are written/reviewed in a controlled admin tool
 * (ContentManager), not arbitrary user input, so this is a reasonable
 * minimal-footprint choice, not a security shortcut.
 */
export default async function InsightPostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const post = await getBlogPostBySlug(supabase, params.slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-24">
      <Link
        href="/insights"
        className="text-xs font-medium text-neutral-500 hover:text-cinnamon-700 dark:text-neutral-400 dark:hover:text-cinnamon-400"
      >
        ← All insights
      </Link>
      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
        {post.published_at
          ? new Date(post.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : ''}
      </p>
      <h1 className="mt-2 font-marketingDisplay text-4xl leading-tight text-black dark:text-white sm:text-5xl">
        {post.title}
      </h1>
      <div className="mt-10 whitespace-pre-wrap text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
        {post.content}
      </div>
    </article>
  );
}
