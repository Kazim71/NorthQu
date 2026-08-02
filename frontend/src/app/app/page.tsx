import Link from 'next/link';
import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganization, getOrganizationAdminFields } from '@/lib/queries';
import { LogoLockup } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignOutButton } from '@/components/SignOutButton';
import { LeadsIcon, SummaryIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

interface ServiceDef {
  key: 'has_leadpulse' | 'has_automation' | 'has_web_services' | 'has_crm';
  name: string;
  description: string;
  href: string | null;
  /** Only LeadPulse is a real, shippable product today (see docs/TODO.md
   * — building dashboards for the other three before they exist would mean
   * fabricated screens with no real backend behind them). */
  builtYet: boolean;
}

const SERVICES: ServiceDef[] = [
  {
    key: 'has_leadpulse',
    name: 'LeadPulse',
    description: 'Visitor tracking, identity resolution, and lead scoring for your storefront.',
    href: '/dashboard',
    builtYet: true,
  },
  {
    key: 'has_automation',
    name: 'Automation',
    description: 'Workflow automation connected to your other NorthQu services.',
    href: null,
    builtYet: false,
  },
  {
    key: 'has_web_services',
    name: 'Web Services',
    description: 'Track and manage website/app builds delivered by NorthQu.',
    href: null,
    builtYet: false,
  },
  {
    key: 'has_crm',
    name: 'CRM',
    description: 'Pipelines, deals, and tasks beyond LeadPulse’s contact list.',
    href: null,
    builtYet: false,
  },
];

/**
 * Post-login landing page for org admins/agents — replaces the old direct
 * redirect('/dashboard'), which hardcoded LeadPulse as THE product a
 * client gets. Shows one card per service; only enabled AND actually-built
 * services are clickable. A client with only Automation enabled (once that
 * product exists) sees exactly that, not a LeadPulse dashboard they never
 * asked for.
 */
export default async function ServiceHubPage() {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();

  const [org, fields] = await Promise.all([
    getOrganization(supabase, viewer.organizationId),
    getOrganizationAdminFields(supabase, viewer.organizationId),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <LogoLockup className="h-7" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-3xl text-black dark:text-white">
          {org?.name ?? 'Your workspace'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Signed in as {viewer.email}. Choose a service to continue.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SERVICES.map((service) => {
            const enabled = fields ? fields[service.key] : service.key === 'has_leadpulse';
            const clickable = enabled && service.builtYet && service.href;

            return (
              <ServiceCard
                key={service.key}
                name={service.name}
                description={service.description}
                href={clickable ? service.href : null}
                status={
                  !enabled
                    ? 'not-enabled'
                    : !service.builtYet
                      ? 'coming-soon'
                      : 'active'
                }
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ServiceCard({
  name,
  description,
  href,
  status,
}: {
  name: string;
  description: string;
  href: string | null;
  status: 'active' | 'coming-soon' | 'not-enabled';
}) {
  const badge = {
    active: (
      <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
      </span>
    ),
    'coming-soon': (
      <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" /> Coming soon
      </span>
    ),
    'not-enabled': (
      <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" /> Not on your plan
      </span>
    ),
  }[status];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-cinnamon-50 text-cinnamon-700 dark:bg-cinnamon-950 dark:text-cinnamon-400">
          {name === 'LeadPulse' ? <LeadsIcon /> : <SummaryIcon />}
        </div>
        {badge}
      </div>
      <h2 className="mt-4 font-display text-lg text-black dark:text-neutral-100">{name}</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
    </>
  );

  const baseClasses =
    'block rounded-xl border p-5 shadow-card transition-all border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950';

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClasses} hover:-translate-y-0.5 hover:border-cinnamon-300 hover:shadow-raised dark:hover:border-cinnamon-700`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`${baseClasses} opacity-60`}>{content}</div>;
}
