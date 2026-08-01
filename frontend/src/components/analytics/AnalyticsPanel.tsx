import { ConversionFunnel } from './ConversionFunnel';
import { RankedBarList } from './RankedBarList';
import { TopProducts } from './TopProducts';
import { TrafficSources, VisitorSplit } from './TrafficSources';
import type { OrgAnalytics } from '@/lib/queries';

/**
 * Presentational only — the page fetches, this arranges.
 *
 * Ordering is by decision-value, not by widget size: the funnel (where are
 * people dropping off) and products (what is and isn't selling) come
 * first because they're what someone actually changes their day over;
 * acquisition and audience mix are context that follows.
 */
export function AnalyticsPanel({ analytics }: { analytics: OrgAnalytics | null }) {
  // Null means migration 0009 isn't applied (see getOrgAnalytics). Say so
  // plainly rather than rendering six empty widgets, which would read as
  // "your store has no activity" — a wrong and alarming thing to imply.
  if (!analytics) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
        <p className="font-medium text-black dark:text-neutral-100">Analytics not enabled yet</p>
        <p className="mt-1">
          Apply migration{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">
            0009_analytics.sql
          </code>{' '}
          in the Supabase SQL editor to turn on the conversion funnel, product
          intelligence, search terms and traffic sources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionFunnel stages={analytics.funnel} />
        <TopProducts products={analytics.topProducts} />
      </div>

      {/* A consistent two-column rhythm throughout, rather than a 3-col row
          followed by a lone card stranded in another — an odd card out reads
          as something failing to load. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RankedBarList
          title="Top searches"
          subtitle="What visitors typed into site search"
          rows={analytics.topSearches.map((s) => ({
            label: s.term,
            value: s.searchCount,
            secondary: { value: s.visitorCount, suffix: 'people' },
          }))}
          valueSuffix="searches"
          emptyMessage="No site searches in this range."
        />

        <RankedBarList
          title="Top categories"
          subtitle="Most-browsed collections"
          rows={analytics.topCategories.map((c) => ({
            label: c.category,
            value: c.viewCount,
            secondary: { value: c.visitorCount, suffix: 'people' },
          }))}
          valueSuffix="views"
          emptyMessage="No category views in this range."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrafficSources sources={analytics.trafficSources} />
        <VisitorSplit
          newVisitors={analytics.visitorTypes.newVisitors}
          returningVisitors={analytics.visitorTypes.returningVisitors}
        />
      </div>
    </div>
  );
}
