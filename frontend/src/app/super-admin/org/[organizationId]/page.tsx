import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  getAdminUsers,
  getEventCountTrend,
  getEventsOverTime,
  getOrganization,
  getOrganizationAdminFields,
  getOrgAnalytics,
  getOrgSummary,
  getVisitors,
} from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { VisitorsTable } from '@/components/VisitorsTable';
import { SummaryPanel } from '@/components/SummaryPanel';
import { AnalyticsPanel } from '@/components/analytics/AnalyticsPanel';
import { DateRangePicker } from '@/components/DateRangePicker';
import { AdminUsersManager } from '@/components/AdminUsersManager';
import { IngestionPauseToggle } from '@/components/IngestionPauseToggle';
import { ServiceFlagsToggle } from '@/components/ServiceFlagsToggle';

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

  const [visitors, summary, eventsOverTime, eventTrend, analytics, adminFields, adminUsers] =
    await Promise.all([
      getVisitors(supabase, params.organizationId, range),
      getOrgSummary(supabase, params.organizationId, range),
      getEventsOverTime(supabase, params.organizationId, range),
      getEventCountTrend(supabase, params.organizationId, range),
      getOrgAnalytics(supabase, params.organizationId, range),
      getOrganizationAdminFields(supabase, params.organizationId),
      getAdminUsers(supabase, params.organizationId),
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

      {adminFields ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <IngestionPauseToggle
            organizationId={params.organizationId}
            initialPaused={adminFields.ingestion_paused}
          />
          <ServiceFlagsToggle
            organizationId={params.organizationId}
            initial={{
              has_leadpulse: adminFields.has_leadpulse,
              has_automation: adminFields.has_automation,
              has_web_services: adminFields.has_web_services,
              has_crm: adminFields.has_crm,
            }}
          />
        </div>
      ) : null}

      <AdminUsersManager
        organizationId={params.organizationId}
        organizationName={org.name}
        initialUsers={adminUsers}
      />

      <SummaryPanel summary={summary} eventsOverTime={eventsOverTime} eventTrend={eventTrend} />

      <AnalyticsPanel analytics={analytics} />

      <div>
        <h2 className="mb-4 font-display text-2xl text-black dark:text-white">
          Visitors{' '}
          <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
            ({visitors.length})
          </span>
        </h2>
        <VisitorsTable visitors={visitors} />
      </div>
    </div>
  );
}
