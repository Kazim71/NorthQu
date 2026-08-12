import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'How NorthQu prices software, automation and lead-system work. Talk to us for a scoped quote.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing',
    description: 'How NorthQu prices software, automation and lead-system work. Talk to us for a scoped quote.',
    url: '/pricing',
  },
};

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="font-marketingDisplay text-5xl text-black dark:text-white sm:text-6xl">Pricing</h1>
      <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
        We&rsquo;re finalizing our pricing structure — reach out for a custom quote in the
        meantime.
      </p>
      <Link
        href="/contact"
        className="mt-8 inline-block rounded-full bg-cinnamon-600 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
      >
        Get in touch
      </Link>
    </section>
  );
}
