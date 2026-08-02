import Link from 'next/link';

/**
 * Real screenshots, not mockups — captured 2026-08-02 from the actual
 * running dashboard at a 390px mobile viewport (headless Chrome,
 * puppeteer-core, same tooling this project's own verify-*.mjs scripts
 * use), against a throwaway demo organization seeded with representative
 * activity and deleted immediately after. Not the live production UI
 * embedded live — a point-in-time capture, which will drift from the real
 * app over time; update these if the dashboard's layout changes
 * materially.
 */
const STEPS = [
  {
    img: '/how-it-works/01-app-hub.png',
    title: 'Sign in, pick a service',
    body: 'Every login lands on the service hub first — not straight into one product. If you only have LeadPulse today, that\'s the one card that\'s clickable; everything else shows honestly as "Coming soon" rather than a broken link.',
  },
  {
    img: '/how-it-works/02-visitors.png',
    title: 'See every visitor, identified or not',
    body: 'One table for everyone who has touched your storefront. Anonymous browsing shows as a visitor ID and activity; the moment someone gives up a phone number or email, their whole prior history attaches to a real name — automatically, not something you have to go looking for.',
  },
  {
    img: '/how-it-works/03-summary.png',
    title: 'A quick-glance overview',
    body: 'Stat cards and an events-over-time chart for a fast read on what\'s happening, with a date-range picker (24h/7d/30d/90d/custom) scoping everything on the page.',
  },
  {
    img: '/how-it-works/04-analytics.png',
    title: 'The deep dive, when you need it',
    body: 'Conversion funnel, top products/searches/categories, and first-touch traffic sources — split into its own tab so Summary stays a quick check, not a long scroll.',
  },
  {
    img: '/how-it-works/05-team.png',
    title: 'Add your own team',
    body: 'Invite teammates yourself — no waiting on us. Set a role, send the temporary password over a secure channel, done. Remove access just as directly when someone leaves.',
  },
  {
    img: '/how-it-works/06-settings.png',
    title: 'Your tracking key, in your control',
    body: 'View and rotate your storefront\'s tracking API key without emailing support. Rotating immediately retires the old key, so the dashboard is explicit about what happens next.',
  },
];

export default function HowItWorksPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
        LeadPulse
      </p>
      <h1 className="mt-4 font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        How it works
      </h1>
      <p className="mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        Real screens from the real dashboard, at real mobile size — not mockups. Six steps from
        first login to running your own team.
      </p>

      <div className="mt-16 space-y-20">
        {STEPS.map((step, i) => (
          <div key={step.title} className="grid items-center gap-8 sm:grid-cols-2">
            <div className={i % 2 === 1 ? 'sm:order-2' : ''}>
              <span className="font-marketingDisplay text-xl text-neutral-400 dark:text-neutral-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-2 font-marketingDisplay text-2xl text-black dark:text-white">
                {step.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                {step.body}
              </p>
            </div>
            <div className={`flex justify-center ${i % 2 === 1 ? 'sm:order-1' : ''}`}>
              <img
                src={step.img}
                alt={step.title}
                className="max-h-[520px] w-auto rounded-2xl border border-neutral-200 shadow-raised dark:border-neutral-800"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center">
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
