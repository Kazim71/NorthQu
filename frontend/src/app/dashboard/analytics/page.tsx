import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrgAnalytics } from '@/lib/queries';
import { parseDateRangeFromSearchParams } from '@/lib/dateRange';
import { AnalyticsPanel } from '@/components/analytics/AnalyticsPanel';
import { DateRangePicker } from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

/**
 * Split out of /dashboard/summary (2026-08-02) — the funnel/products/
 * searches/traffic-sources widgets made Summary a very long single scroll.
 * Summary is now the quick-glance overview (stat cards, events-over-time);
 * this is the deep-dive. Same getOrgAnalytics() query, same
 * graceful-degradation behavior if migration 0009 isn't applied yet.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const range = parseDateRangeFromSearchParams(searchParams);
  const analytics = await getOrgAnalytics(supabase, viewer.organizationId, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-black dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Conversion funnel, product/search intelligence, and traffic sources.
          </p>
        </div>
        <DateRangePicker />
      </div>
      <AnalyticsPanel analytics={analytics} />
    </div>
  );
}
