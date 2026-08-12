import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Honest "in development" page, not a feature page dressed up as a
 * product. LeadPulse's own page (services/leadpulse) can say "built and
 * working today" because it's true and verifiable; Automation has no
 * shipped product behind it yet, so this page describes intent and
 * approach rather than a feature list or screenshots that don't exist.
 */
export const metadata: Metadata = {
  title: 'Automation',
  description:
    'Workflow automation that connects your storefront, your leads and the tools your team already uses.',
  alternates: { canonical: '/services/automation' },
  openGraph: {
    title: 'Automation',
    description: 'Workflow automation that connects your storefront, your leads and the tools your team already uses.',
    url: '/services/automation',
  },
};

export default function AutomationPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
        In development
      </p>
      <h1 className="mt-4 font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        Automation
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        Workflow automation that connects your other systems — including LeadPulse — so the
        repetitive, manual steps between tools happen without someone doing them by hand.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/contact"
          className="rounded-full bg-cinnamon-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Talk to us about your workflow
        </Link>
      </div>

      <div className="mt-20 border-t border-neutral-200 pt-16 dark:border-neutral-800">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">
          What this will do
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          Trigger-and-action automation: a new LeadPulse lead notifies your sales channel, a
          purchase updates a spreadsheet, a form submission kicks off an email sequence — the kind
          of connective work currently done with Zapier, Make, or a person copying data between
          tabs. We haven&rsquo;t shipped this as a self-serve dashboard yet, which is why this page
          doesn&rsquo;t show one.
        </p>
      </div>

      <div className="mt-16 rounded-2xl border border-neutral-200 bg-brand-ivory p-7 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          If this is what you need right now, we build automation as a direct engagement today —
          scoped to your actual tools, not a generic template — while the self-serve product is
          being built.
        </p>
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
