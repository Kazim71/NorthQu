import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';

const TICKER_ITEMS = [
  'Custom Software',
  'AI Automation',
  'Web Development',
  'Lead Systems',
  'Business Automation',
];

const PRINCIPLES = [
  { title: 'Understand', body: 'We start with the problem, not the technology.' },
  { title: 'Build', body: 'We create solutions designed around how your business actually works.' },
  { title: 'Move Forward', body: 'We automate, connect and improve the systems that drive your business.' },
];

const SERVICES = [
  {
    num: '01',
    title: 'Software Solutions',
    body: 'Custom web applications, internal tools, dashboards and digital platforms designed around your workflows.',
    tags: ['Web Applications', 'Internal Tools', 'Dashboards', 'API Integrations'],
    href: '/services#software',
  },
  {
    num: '02',
    title: 'AI & Automation',
    body: 'Practical AI and workflow automation that reduces repetitive work and helps your team operate more efficiently.',
    tags: ['AI Assistants', 'Workflow Automation', 'Business Process Automation', 'AI Integration'],
    href: '/services#ai-automation',
  },
  {
    num: '03',
    title: 'Websites & Digital Experiences',
    body: 'Fast, scalable websites built to communicate clearly, perform reliably and turn visitors into opportunities.',
    tags: ['Business Websites', 'WordPress', 'Landing Pages', 'Custom Development'],
    href: '/services#websites',
  },
  {
    num: '04',
    title: 'Lead & CRM Systems',
    body: 'Systems that capture, organize, track and automate leads from first contact through your sales pipeline.',
    tags: ['Lead Tracking', 'CRM Setup', 'Pipeline Automation', 'Integrations'],
    href: '/services/leadpulse',
  },
];

const DIFFERENTIATOR_STEPS = ['Problem', 'Direction', 'Solution', 'Impact'];

const WORK = [
  {
    name: 'AirLynk',
    tag: 'Transportation Operations Platform',
    body: 'A full-stack platform designed around booking, pricing and operational workflows.',
  },
  {
    name: 'TxnSight',
    tag: 'Transaction Failure Analytics',
    body: 'A backend-driven analytics system for identifying and investigating transaction failures.',
  },
  {
    name: 'AI Knowledge Assistant',
    tag: 'AI · Knowledge Systems · Automation',
    body: 'An intelligent assistant designed around structured knowledge retrieval and controlled responses.',
  },
];

const PROCESS = [
  { num: '01', title: 'Discover', body: 'We understand your business, workflow and actual problem.' },
  { num: '02', title: 'Define', body: 'We identify the right solution and create a clear technical direction.' },
  { num: '03', title: 'Build', body: 'We design, develop and integrate the system.' },
  { num: '04', title: 'Launch & Improve', body: 'We deploy, monitor and continuously improve where needed.' },
];

const TECHNOLOGY = [
  { label: 'Web', items: 'Next.js · React · WordPress' },
  { label: 'Backend', items: 'Python · FastAPI · Node.js' },
  { label: 'Data & Infrastructure', items: 'PostgreSQL · Supabase · Docker · Cloud' },
  { label: 'AI & Automation', items: 'AI APIs · Workflow Automation · Intelligent Integrations' },
];

/**
 * Auth-aware routing lives ONLY here, reusing getViewer() rather than
 * reimplementing role resolution. Logged-in visitors (existing LeadPulse
 * customers/operators) never see this markup — they're redirected
 * straight to their workspace before anything below renders.
 */
export default async function LandingPage() {
  const viewer = await getViewer();

  if (viewer.kind === 'platform_admin') redirect('/super-admin');
  if (viewer.kind === 'org_admin') redirect('/dashboard');
  if (viewer.kind === 'unassigned') redirect('/pending');
  // viewer.kind === 'anonymous' falls through to the landing page below.

  return (
    <div>
      {/* ---- Hero ------------------------------------------------------ */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-28 text-center sm:pt-36">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cinnamon-600 dark:text-cinnamon-400">
          Software · AI · Automation
        </p>
        <h1 className="mt-5 font-marketingDisplay text-5xl leading-[1.05] text-black dark:text-white sm:text-6xl lg:text-7xl">
          Technology that moves your business forward.
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          NorthQu designs and builds software, AI automation, lead management systems and
          digital experiences that solve real business problems.
        </p>
        <div className="mt-11 flex justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-full bg-cinnamon-600 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
          >
            Start a Project
          </Link>
          <Link
            href="/services"
            className="rounded-full border border-neutral-200 dark:border-neutral-800 px-7 py-3.5 text-sm font-medium text-black dark:text-white transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
          >
            Explore Our Services →
          </Link>
        </div>
      </section>

      {/* ---- Service ticker ------------------------------------------- */}
      <div className="overflow-hidden border-y border-neutral-200 py-4 dark:border-neutral-800/80">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex flex-none items-center" aria-hidden={copy === 1}>
              {TICKER_ITEMS.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="mx-5 flex-none text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-600"
                >
                  {item}
                  <span className="ml-5 text-cinnamon-500/60">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Positioning ------------------------------------------------ */}
      <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
            Why NorthQu
          </p>
          <h2 className="mt-4 font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            Your business doesn&rsquo;t need more tools. It needs the right systems working
            together.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Businesses often operate across disconnected websites, spreadsheets, CRMs and manual
            processes. NorthQu identifies where technology can create the most impact, then
            designs and builds the systems to make it happen.
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 p-7 text-left"
              >
                <h3 className="font-marketingDisplay text-xl text-black dark:text-white">{p.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Services --------------------------------------------------- */}
      <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            What we build.
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <div
                key={s.num}
                className="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 p-7 transition-colors hover:border-cinnamon-500/50 dark:hover:border-cinnamon-400/50"
              >
                <span className="font-marketingDisplay text-2xl text-neutral-400 dark:text-neutral-600">
                  {s.num}
                </span>
                <h3 className="mt-3 font-marketingDisplay text-xl text-black dark:text-white">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{s.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-2xs text-neutral-500 dark:text-neutral-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={s.href}
                  className="mt-6 text-sm font-medium text-cinnamon-600 hover:text-cinnamon-700 dark:text-cinnamon-400 dark:hover:text-cinnamon-300"
                >
                  Explore Service →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Differentiator ---------------------------------------------- */}
      <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            We don&rsquo;t start with technology. We start with what isn&rsquo;t working.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Every NorthQu project starts by understanding the problem, the process and the
            outcome. Only then do we decide what should be built, automated or connected.
          </p>

          <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0">
            {DIFFERENTIATOR_STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="rounded-full border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 px-6 py-3 font-marketingDisplay text-base text-black dark:text-white">
                  {step}
                </div>
                {i < DIFFERENTIATOR_STEPS.length - 1 && (
                  <span className="mx-3 hidden text-neutral-300 dark:text-neutral-700 sm:inline">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Selected work ------------------------------------------------ */}
      <section id="work" className="scroll-mt-20 border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            Selected work.
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {WORK.map((project) => (
              <div
                key={project.name}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-7"
              >
                <p className="text-2xs font-medium uppercase tracking-wider text-cinnamon-600 dark:text-cinnamon-400">
                  {project.tag}
                </p>
                <h3 className="mt-3 font-marketingDisplay text-xl text-black dark:text-white">{project.name}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {project.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Process ------------------------------------------------------ */}
      <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            From problem to working product.
          </h2>
          <div className="mt-14 space-y-6">
            {PROCESS.map((step) => (
              <div
                key={step.num}
                className="flex items-start gap-5 border-t border-neutral-200 dark:border-neutral-800 pt-6 first:border-t-0 first:pt-0"
              >
                <span className="flex-none font-marketingDisplay text-lg text-neutral-400 dark:text-neutral-600">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-marketingDisplay text-lg text-black dark:text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Technology ----------------------------------------------------- */}
      <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            Built with the right technology for the job.
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {TECHNOLOGY.map((cat) => (
              <div
                key={cat.label}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6"
              >
                <p className="text-2xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                  {cat.label}
                </p>
                <p className="mt-2 text-base text-black dark:text-white">{cat.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- About -------------------------------------------------------- */}
      <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            Direction before complexity.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            NorthQu is a technology company focused on helping businesses move forward through
            better software, intelligent automation and connected digital systems. The name
            reflects how we approach technology: understand the question, find the right
            direction, and build what creates meaningful progress.
          </p>
          <Link
            href="/about"
            className="mt-6 inline-block text-sm font-medium text-cinnamon-600 hover:text-cinnamon-700 dark:text-cinnamon-400 dark:hover:text-cinnamon-300"
          >
            More about NorthQu →
          </Link>
        </div>
      </section>

      {/* ---- Final CTA (always dark, regardless of page theme) ------------- */}
      <section className="bg-black py-24 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-marketingDisplay text-3xl text-white sm:text-4xl">
            Have a problem technology could solve?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-neutral-400">
            Tell us what&rsquo;s slowing your business down. We&rsquo;ll help you find the right
            way forward.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-block rounded-full bg-cinnamon-500 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-400"
          >
            Start a Conversation →
          </Link>
          <p className="mt-5 text-sm text-neutral-500">
            or write to{' '}
            <a href="mailto:northqu71@gmail.com" className="text-neutral-300 hover:text-white">
              northqu71@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
