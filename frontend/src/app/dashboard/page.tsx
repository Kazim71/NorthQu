import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getVisitors } from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { VisitorsTable } from '@/components/VisitorsTable';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

/**
 * The org-admin lead list: ONLY visitors who have given up contact details
 * (name / phone / email). Anonymous browsing is filtered out server-side by
 * `identifiedOnly` — see getVisitors() for why that happens there rather
 * than in the component.
 *
 * Renamed from "Visitors" to "Leads" when that filter landed: a page that
 * shows only identified people should not be titled with a word that
 * promises everyone who browsed. The super-admin per-org view keeps the
 * full unfiltered picture, still under the "Visitors" heading.
 *
 * Page fetches; the table renders. No Supabase calls inside JSX.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const range = parseDateRangeFromSearchParams(searchParams);
  const leads = await getVisitors(supabase, viewer.organizationId, range, {
    identifiedOnly: true,
  });

  const reachable = leads.filter((v) => v.phone !== null || v.email !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-black dark:text-white">Leads</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} in this range
            {leads.length > 0 ? ` · ${reachable} with a phone or email` : ''}
          </p>
        </div>
        <DateRangePicker />
      </div>
      <VisitorsTable visitors={leads} identifiedOnly />
    </div>
  );
}
