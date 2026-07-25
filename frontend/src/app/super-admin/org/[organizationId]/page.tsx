import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  getAnonymousVisitors,
  getEventCountTrend,
  getEventsOverTime,
  getLeads,
  getOrganization,
  getOrgSummary,
} from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { LeadsTable } from '@/components/LeadsTable';
import { AnonymousVisitorsTable } from '@/components/AnonymousVisitorsTable';
import { SummaryPanel } from '@/components/SummaryPanel';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

/**
 * Same LeadsTable, AnonymousVisitorsTable, and SummaryPanel components as
 * the org-admin view — the only difference is where organizationId comes
 * from (URL param here, session there). The param is safe ONLY because
 * requirePlatformAdmin() runs first and the parent layout gates the whole
 * subtree. `enableActions` is deliberately left off LeadsTable here: a
 * platform admin observes tenants, they don't act on a tenant's own leads
 * (that write path is scoped to the org's own RLS-authenticated admins).
 */
export default async function SuperAdminOrgPage({
  params,
  searchParams,
}: {
  params: { organizationId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePlatformAdmin();

  const supabase = createClient();
  const org = await getOrganization(supabase, params.organizationId);

  // A platform admin can read every org, so a miss here means the id is
  // genuinely bogus rather than merely forbidden.
  if (!org) notFound();

  const range = parseDateRangeFromSearchParams(searchParams);

  const [leads, anonymousVisitors, summary, eventsOverTime, eventTrend] = await Promise.all([
    getLeads(supabase, params.organizationId, range),
    getAnonymousVisitors(supabase, params.organizationId, range),
    getOrgSummary(supabase, params.organizationId, range),
    getEventsOverTime(supabase, params.organizationId, range),
    getEventCountTrend(supabase, params.organizationId, range),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/super-admin"
            className="text-xs font-medium text-neutral-500 transition-colors hover:text-cinnamon-700 dark:text-neutral-400 dark:hover:text-cinnamon-400"
          >
            ← All companies
          </Link>
          <h1 className="mt-2 font-display text-3xl text-black dark:text-white">{org.name}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {org.industry ?? 'Uncategorized'} · {org.slug}
          </p>
        </div>
        <DateRangePicker />
      </div>

      <SummaryPanel summary={summary} eventsOverTime={eventsOverTime} eventTrend={eventTrend} />

      <div>
        <h2 className="mb-4 font-display text-2xl text-black dark:text-white">Leads</h2>
        <LeadsTable leads={leads} />
      </div>

      <div>
        <h2 className="mb-4 font-display text-2xl text-black dark:text-white">
          Anonymous Visitors{' '}
          <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
            ({anonymousVisitors.length})
          </span>
        </h2>
        <AnonymousVisitorsTable visitors={anonymousVisitors} />
      </div>
    </div>
  );
}
