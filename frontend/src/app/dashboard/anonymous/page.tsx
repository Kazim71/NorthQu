import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAnonymousVisitors } from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { AnonymousVisitorsTable } from '@/components/AnonymousVisitorsTable';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

/**
 * Visitors with events but no linked contact yet — real visibility into
 * anonymous browsing, scoped to the selected date range (see
 * migration 0007's get_anonymous_visitors(): range-filtering happens before
 * aggregation, so this is honestly "activity in this window," not an
 * all-time count clipped after the fact).
 */
export default async function AnonymousVisitorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const range = parseDateRangeFromSearchParams(searchParams);
  const visitors = await getAnonymousVisitors(supabase, viewer.organizationId, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-black dark:text-white">Anonymous Visitors</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {visitors.length} unidentified {visitors.length === 1 ? 'visitor' : 'visitors'} in this range
          </p>
        </div>
        <DateRangePicker />
      </div>
      <AnonymousVisitorsTable visitors={visitors} />
    </div>
  );
}
