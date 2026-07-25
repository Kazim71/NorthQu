import Link from 'next/link';

const SERVICES = [
  {
    id: 'software',
    num: '01',
    title: 'Software Solutions',
    intro:
      'Custom web applications, internal tools, dashboards and digital platforms designed around your workflows.',
    body:
      "Off-the-shelf software makes you adapt your process to fit the tool. We build the reverse: applications shaped around how your team already works, so the software fits the business instead of the other way around. That includes internal tools that replace spreadsheet-and-email workflows, dashboards that surface the numbers that actually matter, and integrations that connect systems that were never designed to talk to each other.",
    tags: ['Web Applications', 'Internal Tools', 'Dashboards', 'API Integrations'],
  },
  {
    id: 'ai-automation',
    num: '02',
    title: 'AI & Automation',
    intro:
      'Practical AI and workflow automation that reduces repetitive work and helps your team operate more efficiently.',
    body:
      "Not every problem needs an AI model, and we don't force one where a simpler automation would do. Where AI is the right fit — an assistant that answers questions from your own documentation, a classification step in a larger workflow — we build it as one working part of a system, not a demo. Where the fix is simpler, we automate the repetitive, manual steps between the tools you already run.",
    tags: ['AI Assistants', 'Workflow Automation', 'Business Process Automation', 'AI Integration'],
  },
  {
    id: 'websites',
    num: '03',
    title: 'Websites & Digital Experiences',
    intro:
      'Fast, scalable websites built to communicate clearly, perform reliably and turn visitors into opportunities.',
    body:
      "A website is often the first real interaction someone has with your business — it needs to load fast, explain what you do without friction, and give a visitor a clear next step. We build everything from marketing sites and landing pages to fuller custom builds and WordPress sites, depending on what the business actually needs rather than defaulting to the heaviest option.",
    tags: ['Business Websites', 'WordPress', 'Landing Pages', 'Custom Development'],
  },
  {
    id: 'leadpulse',
    num: '04',
    title: 'Lead & CRM Systems',
    intro:
      'Systems that capture, organize, track and automate leads from first contact through your sales pipeline.',
    body:
      'This is where LeadPulse — our own lead tracking and identity resolution platform — comes in: capturing anonymous visitor behavior on your storefront, resolving it to a real contact the moment they identify themselves, and giving your team a single dashboard that already knows who’s worth reaching out to. It’s a fully built, working product, not a concept.',
    tags: ['Lead Tracking', 'CRM Setup', 'Pipeline Automation', 'Integrations'],
    cta: { label: 'See LeadPulse →', href: '/services/leadpulse' },
  },
];

export default function ServicesPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-marketingDisplay text-5xl text-black dark:text-white sm:text-6xl">
        What we build.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
        Four areas of work, each starting from the same question: what problem are we actually
        solving?
      </p>

      <div className="mt-16 space-y-16">
        {SERVICES.map((s) => (
          <div
            key={s.id}
            id={s.id}
            className="scroll-mt-24 border-t border-neutral-200 dark:border-neutral-800 pt-10 first:border-t-0 first:pt-0"
          >
            <div className="flex items-start gap-5">
              <span className="flex-none font-marketingDisplay text-2xl text-neutral-400 dark:text-neutral-600">
                {s.num}
              </span>
              <div>
                <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">{s.title}</h2>
                <p className="mt-2 text-base font-medium text-neutral-700 dark:text-neutral-300">{s.intro}</p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {s.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-2xs text-neutral-500 dark:text-neutral-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {s.cta && (
                  <Link
                    href={s.cta.href}
                    className="mt-6 inline-block text-sm font-medium text-cinnamon-600 hover:text-cinnamon-700 dark:text-cinnamon-400 dark:hover:text-cinnamon-300"
                  >
                    {s.cta.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 p-8 text-center">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">
          Not sure which of these fits?
        </h2>
        <p className="mt-2.5 text-base text-neutral-600 dark:text-neutral-400">
          That&rsquo;s the first conversation, not something you need to figure out beforehand.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-block rounded-full bg-cinnamon-600 px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Start a Project
        </Link>
      </div>
    </section>
  );
}
