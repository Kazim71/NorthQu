import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What data NorthQu and LeadPulse collect, why, who processes it, and how to have it removed.',
  alternates: { canonical: '/privacy' },
};

/**
 * Written against what this codebase ACTUALLY does — every claim below is
 * traceable to real code, not a generic template:
 *  - fields listed = events/contacts columns (migrations 0001, 0007, 0008)
 *  - identifiers    = tracking-snippet/src/visitorId.ts (localStorage + cookie)
 *  - sub-processors = the real deployment (Supabase, Render, Vercel) and the
 *                     one outbound third-party call, ipwho.is (backend/src/lib/geoip.ts)
 *  - retention      = deliberately stated as "no fixed window yet", because
 *                     that is the truth and is tracked as an open item in
 *                     docs/TODO.md rather than a decided policy.
 *
 * NOT legal advice and not a substitute for review by a qualified adviser
 * before this is relied on commercially — flagged in the page itself so a
 * reader is not misled about its status, and in docs/TODO.md so it isn't
 * mistaken internally for a completed compliance step.
 */
const UPDATED = '2 August 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-marketingDisplay text-5xl leading-tight text-black dark:text-white">
        Privacy
      </h1>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Last updated {UPDATED}
      </p>

      <p className="mt-8 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
        This covers two different things: data collected about visitors to{' '}
        <strong className="text-black dark:text-white">this website</strong>, and data that
        LeadPulse — our lead-tracking product — collects{' '}
        <strong className="text-black dark:text-white">on our clients&rsquo; websites</strong>.
        They are treated differently, and the second one is the part most people are actually
        asking about.
      </p>

      <Section title="LeadPulse on a client's website">
        <p>
          When a business installs LeadPulse on their storefront, our script records browsing
          activity on <em>their</em> site — pages viewed, products viewed, searches typed,
          items added to cart, and checkouts completed.
        </p>
        <p>Against each of those events we store:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            A random <strong className="text-black dark:text-white">visitor ID</strong> we
            generate — kept in that browser&rsquo;s local storage and a first-party cookie. It
            is not linked to any identity until the visitor provides one.
          </li>
          <li>
            The <strong className="text-black dark:text-white">IP address</strong> the request
            came from, and a rough location (city, region, country) derived from it.
          </li>
          <li>
            <strong className="text-black dark:text-white">Browser, operating system and
            device type</strong>, read from the standard user-agent string.
          </li>
          <li>The page URL and the time.</li>
        </ul>
        <p>
          If the visitor later submits a form or completes a checkout on that site, the business
          passes us the <strong className="text-black dark:text-white">name, phone number,
          email and address details</strong> they entered, and we attach their earlier
          anonymous activity to that record. That linkage is the core of what the product does,
          and it is worth being plain about it.
        </p>
        <p>
          In this arrangement the business running the storefront is the data controller and
          NorthQu is a processor acting on their instructions. Requests to see or delete data
          collected on a client&rsquo;s site should go to that business; if you send them to us,
          we will pass them on.
        </p>
      </Section>

      <Section title="What we do not do">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            We do not sell personal data, and we do not share it between clients. Each
            client&rsquo;s data is isolated at the database level, not merely filtered in the
            application.
          </li>
          <li>
            We do not use third-party advertising or tracking networks, and we do not build
            cross-site profiles. LeadPulse only sees activity on the site it is installed on.
          </li>
          <li>
            We do not run behavioural advertising, retargeting pixels, or data brokerage of any
            kind.
          </li>
        </ul>
      </Section>

      <Section title="This website">
        <p>
          The public NorthQu site sets a cookie only to remember your light/dark theme
          preference, and — if you log in — the cookies required to keep you signed in. If you
          submit the contact form, the details you type are stored so we can reply to you.
        </p>
      </Section>

      <Section title="Who else processes this data">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-black dark:text-white">Supabase</strong> — database,
            authentication and hosting for stored data.
          </li>
          <li>
            <strong className="text-black dark:text-white">Render</strong> — runs the API that
            receives tracking events.
          </li>
          <li>
            <strong className="text-black dark:text-white">Vercel</strong> — hosts this website
            and the dashboard.
          </li>
          <li>
            <strong className="text-black dark:text-white">ipwho.is</strong> — receives an IP
            address in order to return an approximate location. It receives nothing else.
          </li>
        </ul>
      </Section>

      <Section title="How long it is kept">
        <p>
          Contact records are kept for as long as the business we collect them for remains a
          client, and are removed on request.
        </p>
        <p>
          We are being straight about one gap: event records, including the IP address on each
          one, do not yet have a fixed automatic expiry. Adding a defined retention window is
          an open item on our side, not something we have quietly decided against. Until it
          ships, deletion on request is the mechanism, and it works today.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask what we hold about you, ask for it to be corrected, or ask for it to be
          deleted. If the data was collected through a client&rsquo;s storefront, contact that
          business first, as described above.
        </p>
        <p>
          Reach us at{' '}
          <a
            href="mailto:northqu71@gmail.com"
            className="text-cinnamon-600 hover:underline dark:text-cinnamon-400"
          >
            northqu71@gmail.com
          </a>{' '}
          or through the{' '}
          <Link href="/contact" className="text-cinnamon-600 hover:underline dark:text-cinnamon-400">
            contact form
          </Link>
          .
        </p>
      </Section>

      <div className="mt-16 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          This page describes our actual practices in plain language. It has not been reviewed
          by a lawyer and is not legal advice. If you need a policy that has been assessed
          against a specific regulation, that review is still to be done.
        </p>
      </div>
    </section>
  );
}
