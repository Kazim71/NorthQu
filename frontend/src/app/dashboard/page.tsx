import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLeads } from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { LeadsTable } from '@/components/LeadsTable';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

/**
 * Page fetches; LeadsTable renders. No Supabase calls inside JSX.
 *
 * `searchParams` drives the date range via DateRangePicker — see
 * lib/dateRange.ts. The range scopes each lead's event count/activity
 * trail, not which contacts appear (see getLeads()'s doc comment).
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const range = parseDateRangeFromSearchParams(searchParams);
  const leads = await getLeads(supabase, viewer.organizationId, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading title="Leads" subtitle={`${leads.length} known ${leads.length === 1 ? 'contact' : 'contacts'}`} />
        <DateRangePicker />
      </div>
      <LeadsTable leads={leads} enableActions />
    </div>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl text-black dark:text-white">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
    </div>
  );
}
