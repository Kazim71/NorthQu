import Link from 'next/link';

/**
 * Not purely "in development" like automation/web-services/crm — the
 * generation engine is real (/api/admin/content/generate, migration
 * 0011) and already produces NorthQu's own /insights posts. What's NOT
 * built is a client-facing version of it (a dashboard tab, per-org
 * content, scheduling/publishing to a client's own site). Stated exactly
 * that way, not rounded up to "available now."
 */
export default function AiContentPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
        In development
      </p>
      <h1 className="mt-4 font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        AI Content
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        AI-assisted blog writing and content generation. The engine is real — it&rsquo;s what
        writes the posts on{' '}
        <Link href="/insights" className="text-cinnamon-600 hover:underline dark:text-cinnamon-400">
          our own Insights page
        </Link>
        . A version clients can use for their own site isn&rsquo;t built yet.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/contact"
          className="rounded-full bg-cinnamon-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Talk to us about your content
        </Link>
        <Link
          href="/insights"
          className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-black transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:border-neutral-800 dark:text-white dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
        >
          See it in action
        </Link>
      </div>

      <div className="mt-20 border-t border-neutral-200 pt-16 dark:border-neutral-800">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">
          What&rsquo;s real today, what isn&rsquo;t
        </h2>
        <div className="mt-10 space-y-10">
          <div>
            <h3 className="font-marketingDisplay text-lg text-black dark:text-white">
              Built: topic → reviewed draft → published post
            </h3>
            <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Give it a topic, it drafts a full post. Nothing goes live automatically — every
              draft is reviewed and edited before publishing. That&rsquo;s exactly how we write our
              own Insights posts, not a hypothetical.
            </p>
          </div>
          <div>
            <h3 className="font-marketingDisplay text-lg text-black dark:text-white">
              Not built: a client-facing version
            </h3>
            <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Today this tool only writes for NorthQu&rsquo;s own site. Offering it to clients —
              their own topics, their own site, scheduling — is a real next step, not something
              you can sign up for yet.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/contact"
          className="inline-block rounded-full bg-cinnamon-600 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Start a conversation
        </Link>
      </div>
    </section>
  );
}
