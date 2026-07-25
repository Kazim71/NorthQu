import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getEventCountTrend, getEventsOverTime, getOrgSummary } from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { SummaryPanel } from '@/components/SummaryPanel';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const range = parseDateRangeFromSearchParams(searchParams);
  const [summary, eventsOverTime, eventTrend] = await Promise.all([
    getOrgSummary(supabase, viewer.organizationId, range),
    getEventsOverTime(supabase, viewer.organizationId, range),
    getEventCountTrend(supabase, viewer.organizationId, range),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-black dark:text-white">Summary</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Aggregate activity across your storefront.
          </p>
        </div>
        <DateRangePicker />
      </div>
      <SummaryPanel summary={summary} eventsOverTime={eventsOverTime} eventTrend={eventTrend} />
    </div>
  );
}
