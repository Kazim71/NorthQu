import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CRM',
  description:
    'Pipelines, deals and tasks built around how your team actually sells — beyond a contact list.',
  alternates: { canonical: '/services/crm' },
  openGraph: {
    title: 'CRM',
    description: 'Pipelines, deals and tasks built around how your team actually sells — beyond a contact list.',
    url: '/services/crm',
  },
};

export default function CrmPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
        In development
      </p>
      <h1 className="mt-4 font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        CRM
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        LeadPulse already resolves anonymous visitors into contacts with a lead-priority score.
        A full CRM — pipeline stages, deals, notes, tasks, assignment to agents — extends that
        foundation. It&rsquo;s being built as our own product, not a demo of one yet.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/contact"
          className="rounded-full bg-cinnamon-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Talk to us about your pipeline
        </Link>
      </div>

      <div className="mt-20 border-t border-neutral-200 pt-16 dark:border-neutral-800">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">Two paths</h2>
        <div className="mt-10 space-y-10">
          <div>
            <h3 className="font-marketingDisplay text-lg text-black dark:text-white">
              Build it in, on top of LeadPulse
            </h3>
            <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              For a client whose CRM needs are simple — a pipeline, a few stages, assigning
              contacts to agents — the plan is to extend LeadPulse&rsquo;s existing contact model
              rather than stand up a separate product with its own login and its own copy of the
              data.
            </p>
          </div>
          <div>
            <h3 className="font-marketingDisplay text-lg text-black dark:text-white">
              Integrate with what you already run
            </h3>
            <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              If you&rsquo;re already committed to HubSpot, Zoho, Salesforce, or another CRM, the
              more practical fit is often pushing LeadPulse leads into that system rather than
              asking you to switch. We build that integration where it&rsquo;s the better answer
              for the business, not by default.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 rounded-2xl border border-neutral-200 bg-brand-ivory p-7 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          Which path fits depends on what you already use and how complex your pipeline actually
          is — that&rsquo;s a conversation, not something this page can answer for you.
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
