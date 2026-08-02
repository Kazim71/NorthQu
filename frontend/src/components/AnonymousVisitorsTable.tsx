'use client';

import { useState } from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { EmptyState } from './ui/EmptyState';
import { formatDateTime } from '@/lib/formatDate';
import type { AnonymousVisitor } from '@/lib/queries';

/**
 * Visitors with events but no linked contact — real activity for someone
 * who has NOT identified themselves. Deliberately shows only what actually
 * exists for an anonymous visitor: a visitor_id, timestamps, event count,
 * and (if resolved) location/device. There is no name/phone/email field
 * anywhere in this component, not even blank — those don't exist for an
 * anonymous visitor, and rendering an empty "Name" column would imply a
 * fact the data doesn't have.
 *
 * Same expandable-row table pattern as LeadsTable, sharing ActivityTimeline
 * for the detail view rather than a second implementation of that markup.
 */
export function AnonymousVisitorsTable({ visitors }: { visitors: AnonymousVisitor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (visitors.length === 0) {
    return (
      <EmptyState
        title="No anonymous visitors in this range"
        description="Anonymous browsing activity — page views, searches, product views — will show up here before a visitor identifies themselves."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-black">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-white text-2xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-black/50 dark:text-neutral-400">
            <th className="px-5 py-3 font-medium">Visitor ID</th>
            <th className="px-5 py-3 font-medium">First seen</th>
            <th className="px-5 py-3 font-medium">Last seen</th>
            <th className="px-5 py-3 text-right font-medium">Events</th>
            <th className="px-5 py-3 font-medium">Location</th>
            <th className="px-5 py-3 font-medium">Device / Browser</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {visitors.map((v) => {
            const isOpen = expanded === v.visitorId;
            const location = [v.city, v.country].filter(Boolean).join(', ') || 'Unknown';
            const device =
              v.deviceBrowser || v.deviceOs
                ? [v.deviceBrowser, v.deviceOs].filter(Boolean).join(' · ')
                : 'Unknown';
            return (
              <>
                <tr
                  key={v.visitorId}
                  onClick={() => setExpanded(isOpen ? null : v.visitorId)}
                  className="cursor-pointer transition-colors hover:bg-cinnamon-50/60 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300" title={v.visitorId}>
                      {truncateVisitorId(v.visitorId)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                    {formatDateTime(v.firstSeen)}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                    {formatDateTime(v.lastSeen)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                    {v.eventCount}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{location}</td>
                  <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">{device}</td>
                </tr>

                {isOpen ? (
                  <tr key={`${v.visitorId}-detail`} className="bg-white/70 dark:bg-black/40">
                    <td colSpan={6} className="px-5 py-4">
                      <ActivityTimeline
                        events={v.recentEvents}
                        emptyMessage="No events recorded for this visitor in the selected range."
                      />
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** First 8 + last 4 characters — enough to eyeball-distinguish rows without a full UUID cluttering the column. */
function truncateVisitorId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
