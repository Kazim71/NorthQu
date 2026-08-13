import type { Metadata } from 'next';
import { ContactForm } from '@/components/marketing/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Start a conversation with NorthQu about software, AI automation, lead tracking or a website build.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact',
    description: 'Start a conversation with NorthQu about software, AI automation, lead tracking or a website build.',
    url: '/contact',
  },
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-lg px-6 py-24">
      <h1 className="font-marketingDisplay text-5xl text-black dark:text-white sm:text-6xl">Get in touch</h1>
      <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-400">
        Questions about NorthQu, or want to get your storefront set up?
        Send a message below.
      </p>

      <div className="mt-12">
        <ContactForm />
      </div>
    </section>
  );
}
