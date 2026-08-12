import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Same honesty rule as services/automation: this describes an engagement
 * model NorthQu actually delivers (custom builds — see /services' Software
 * Solutions and Websites categories, which ARE real work), not a
 * self-serve product dashboard that doesn't exist. The "portal" idea
 * (track your project's status/milestones in a login) is future work,
 * named as such, not implied to exist today.
 */
export const metadata: Metadata = {
  title: 'Web Services',
  description:
    'Websites and web apps built to be fast, measurable and maintainable — not just launched.',
  alternates: { canonical: '/services/web-services' },
  openGraph: {
    title: 'Web Services',
    description: 'Websites and web apps built to be fast, measurable and maintainable — not just launched.',
    url: '/services/web-services',
  },
};

export default function WebServicesPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
        In development
      </p>
      <h1 className="mt-4 font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        Web Services
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        Website and web-app builds, delivered as a project today — a self-serve dashboard where
        you can track status and deliverables without emailing us for an update is planned, not
        live yet.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/contact"
          className="rounded-full bg-cinnamon-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Start a project
        </Link>
        <Link
          href="/services#websites"
          className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-black transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:border-neutral-800 dark:text-white dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
        >
          What we build
        </Link>
      </div>

      <div className="mt-20 border-t border-neutral-200 pt-16 dark:border-neutral-800">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">
          How this works today
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          Marketing sites, landing pages, custom web applications, and WordPress builds — scoped
          and delivered as a project engagement, coordinated directly rather than through a
          client-facing dashboard. If you want to see progress, you talk to the person building
          it.
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          What&rsquo;s planned: a project portal showing milestones and deliverables in one place,
          the same login you&rsquo;d use for LeadPulse if you have both. Not built yet — named here
          so it&rsquo;s clear what&rsquo;s coming versus what exists.
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
