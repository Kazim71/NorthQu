import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getVisitors } from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { VisitorsTable } from '@/components/VisitorsTable';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

/**
 * The single unified dashboard: every visitor in one table, identified or
 * not (see VisitorsTable). Replaces the previous split /dashboard (Leads)
 * + /dashboard/anonymous (Anonymous Visitors) pair.
 *
 * Page fetches; the table renders. No Supabase calls inside JSX.
 */
export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const range = parseDateRangeFromSearchParams(searchParams);
  const visitors = await getVisitors(supabase, viewer.organizationId, range);

  const identified = visitors.filter((v) => v.contactId !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-black dark:text-white">Visitors</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {visitors.length} {visitors.length === 1 ? 'visitor' : 'visitors'} in this range ·{' '}
            {identified} identified
          </p>
        </div>
        <DateRangePicker />
      </div>
      <VisitorsTable visitors={visitors} />
    </div>
  );
}
