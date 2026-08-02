import Link from 'next/link';

/**
 * Consolidates the two pages that used to exist when LeadPulse was the
 * whole company's identity — (marketing)/features and (marketing)/product
 * — into one page for LeadPulse as a single offering under NorthQu.
 * /features and /product now redirect here (see next.config.mjs).
 *
 * Every claim below is preserved from those pages' already-verified
 * content, not rewritten from scratch — see the original files' history
 * in docs/CHANGELOG.md for what was checked against the codebase (the 11
 * EVENT_TYPES, force-dynamic dashboard pages, absence of CSV export).
 */
const FLOW = [
  {
    label: 'Your storefront stays exactly as it is',
    body: "One small script tag, added once. It doesn't touch checkout, doesn't change your theme, and doesn't require ripping out whatever analytics you already run alongside it.",
  },
  {
    label: 'It watches quietly in the background',
    body: 'Every product view, search, and cart add gets recorded against a visitor ID your storefront never has to think about — no anonymous-user table to maintain, no extra database to run.',
  },
  {
    label: 'Your existing checkout or contact flow does the identifying',
    body: 'You don’t add a new "who are you" step. The moment your existing checkout, WhatsApp chat, or contact form captures a phone number or email, that identity links back to everything the visitor already did.',
  },
  {
    label: 'The dashboard is where you actually work',
    body: "Instead of exporting raw analytics and cross-referencing spreadsheets, you open one screen that already knows who's ready to be messaged and what they were looking at.",
  },
];

const FEATURES = [
  {
    title: 'Anonymous visitor tracking',
    body: 'A lightweight snippet (under 5kb, no dependencies) records page views, searches, category views, product views, and cart adds — before a visitor is identified. Client-side debounce filters out duplicate fires from scroll handlers and double clicks.',
  },
  {
    title: 'Identity resolution',
    body: 'When a visitor gives up a phone number or email, every anonymous event tied to their visitor ID is retroactively linked to that contact in a single atomic operation — no partial state if it fails partway through.',
  },
  {
    title: 'Multi-tenant, isolated at the database level',
    body: "Each organization's contacts and events are enforced separately by Postgres row-level security, not just filtered in application code. A platform admin can see across every organization; an individual organization's admin cannot see any other tenant's data, even by guessing a URL.",
  },
  {
    title: 'Ready-to-message status',
    body: "Every contact carries a status — ready, cooldown, messaged, or none — so the dashboard can surface exactly who's worth reaching out to without reading through raw event logs.",
  },
  {
    title: 'Always-current dashboard',
    body: 'Leads, summary stats, and activity charts reflect the data as of your most recent page load — a straightforward, request-time view rather than a delayed batch report.',
  },
  {
    title: 'Platform-wide oversight',
    body: 'A separate super-admin view aggregates activity across every client organization, with drill-down into any individual tenant — for the platform operator, not for individual clients.',
  },
];

export default function LeadPulsePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
        A NorthQu product
      </p>
      <h1 className="mt-4 font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        LeadPulse
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        Our lead tracking and identity resolution platform. It isn&rsquo;t a replacement for your
        storefront, your CRM, or whatever you already use to run checkout — it fills the gap
        those tools leave open: the browsing that happens before someone becomes a customer, and
        the moment it stops being anonymous.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/login"
          className="rounded-full bg-cinnamon-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Log in to your dashboard
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-neutral-200 dark:border-neutral-800 px-6 py-3 text-sm font-medium text-black dark:text-white transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
        >
          Get LeadPulse for your business
        </Link>
      </div>

      <Link
        href="/how-it-works"
        className="mt-4 inline-block text-sm font-medium text-cinnamon-600 hover:text-cinnamon-700 dark:text-cinnamon-400 dark:hover:text-cinnamon-300"
      >
        See how it works, screen by screen →
      </Link>

      {/* ---- How it works --------------------------------------------- */}
      <div className="mt-20">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">How it works</h2>
        <div className="mt-10 space-y-12">
          {FLOW.map((step, i) => (
            <div key={step.label} className="flex gap-6">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 font-marketingDisplay text-lg text-black dark:text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-marketingDisplay text-xl text-black dark:text-white">{step.label}</h3>
                <p className="mt-2.5 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Features --------------------------------------------------- */}
      <div className="mt-20 border-t border-neutral-200 dark:border-neutral-800 pt-16">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">
          What&rsquo;s built and working today
        </h2>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">Not a roadmap.</p>

        <div className="mt-10 space-y-10">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="flex gap-6 border-t border-neutral-200 dark:border-neutral-800 pt-7 first:border-t-0 first:pt-0"
            >
              <span className="flex-none font-marketingDisplay text-xl text-neutral-400 dark:text-neutral-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-marketingDisplay text-lg text-black dark:text-white">{f.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- In practice -------------------------------------------------- */}
      <div className="mt-16 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 p-7">
        <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          In practice: an e-commerce store keeps Shopify for checkout and inventory, keeps its
          usual customer-support tools for conversations already in progress, and adds LeadPulse
          as the layer that catches everyone in between — the visitor who searched, looked at
          three products, and left, whose identity only shows up later.
        </p>
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/login"
          className="inline-block rounded-full bg-cinnamon-600 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Log in to your dashboard
        </Link>
      </div>
    </section>
  );
}
