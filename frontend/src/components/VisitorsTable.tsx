'use client';

import { useMemo, useState } from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { EmptyState } from './ui/EmptyState';
import { toCsv, downloadTextFile } from '@/lib/csv';
import type { Visitor } from '@/lib/queries';

/**
 * THE unified dashboard table: every visitor in one list, identified or not.
 *
 * Replaces the old split LeadsTable / AnonymousVisitorsTable pair. A visitor
 * who has identified themselves shows their real contact details; one who
 * hasn't shows "—" in those columns. The distinction is visible in the data
 * itself rather than by living on a separate page — which is what the split
 * view was really encoding.
 *
 * "—" is used ONLY for genuinely absent data. It never stands in for a value
 * we merely failed to look up and could have had: an unresolved location or
 * device is also null and also renders "—", which is the honest answer in
 * both cases ("we don't know"), never a guess.
 *
 * The message-status column (ready/cooldown/messaged/none) and its
 * mark-as-messaged action were REMOVED here, per an explicit request. The
 * underlying computed `message_status` (migration 0006) and
 * `contacts.messaged_at` are untouched in the database — only this view
 * stopped surfacing them, so nothing is lost if it comes back.
 */

const FILTERS = ['all', 'identified', 'anonymous'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  identified: 'Identified',
  anonymous: 'Anonymous',
};

/** Em dash for absent data — one constant so it's consistent everywhere. */
const NONE = '—';

export function VisitorsTable({ visitors }: { visitors: Visitor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(
    () => ({
      all: visitors.length,
      identified: visitors.filter((v) => v.contactId !== null).length,
      anonymous: visitors.filter((v) => v.contactId === null).length,
    }),
    [visitors],
  );

  const filtered = useMemo(() => {
    if (filter === 'identified') return visitors.filter((v) => v.contactId !== null);
    if (filter === 'anonymous') return visitors.filter((v) => v.contactId === null);
    return visitors;
  }, [visitors, filter]);

  function handleExport() {
    const headers = [
      'Name', 'Phone', 'Email', 'Visitor ID', 'IP address', 'City', 'State', 'Country',
      'Device', 'OS', 'Browser', 'Events', 'Pages', 'First seen', 'Last seen',
    ];
    const rows = filtered.map((v) => [
      v.name ?? '', v.phone ?? '', v.email ?? '', v.visitorId, v.ipAddress ?? '',
      v.city ?? '', v.state ?? '', v.country ?? '',
      v.deviceType ?? '', v.deviceOs ?? '', v.deviceBrowser ?? '',
      v.eventCount, v.pageCount, v.firstSeen, v.lastSeen,
    ]);
    const suffix = filter === 'all' ? '' : `-${filter}`;
    downloadTextFile(`visitors${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  }

  if (visitors.length === 0) {
    return (
      <EmptyState
        title="No visitors in this range"
        description="Browsing activity appears here as soon as the tracking snippet reports it — anonymous at first, with contact details filled in once a visitor identifies themselves."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? 'rounded-full bg-cinnamon-600 px-3.5 py-1.5 text-xs font-medium text-white'
                : 'rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-cinnamon-400 dark:border-neutral-700 dark:text-neutral-300'
            }
          >
            {FILTER_LABEL[f]} <span className="tabular-nums opacity-70">{counts[f]}</span>
          </button>
        ))}
        <button
          onClick={handleExport}
          className="ml-auto rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-black">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-white text-2xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-black/50 dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Visitor ID</th>
              <th className="px-4 py-3 font-medium">IP address</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Device / Browser</th>
              <th className="px-4 py-3 text-right font-medium">Events</th>
              <th className="px-4 py-3 text-right font-medium">Pages</th>
              <th className="px-4 py-3 font-medium">First seen</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No {filter} visitors in this range.
                </td>
              </tr>
            ) : (
              filtered.map((v) => {
                const isOpen = expanded === v.visitorId;
                const identified = v.contactId !== null;
                const location = [v.city, v.state, v.country].filter(Boolean).join(', ') || NONE;
                const device =
                  [v.deviceBrowser, v.deviceOs].filter(Boolean).join(' · ') || NONE;
                return (
                  <>
                    <tr
                      key={v.visitorId}
                      onClick={() => setExpanded(isOpen ? null : v.visitorId)}
                      className="cursor-pointer transition-colors hover:bg-cinnamon-50/60 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3.5">
                        {identified ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-black dark:text-neutral-100">
                              {v.name ?? 'Unnamed lead'}
                            </span>
                            {v.phone ? (
                              <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{v.phone}</span>
                            ) : null}
                            {v.email ? (
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">{v.email}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">{NONE}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400" title={v.visitorId}>
                          {truncateVisitorId(v.visitorId)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                          {v.ipAddress ?? NONE}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">{location}</td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">{device}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                        {v.eventCount}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                        {v.pageCount}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">
                        {new Date(v.firstSeen).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-400">
                        {new Date(v.lastSeen).toLocaleString()}
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr key={`${v.visitorId}-detail`} className="bg-white/70 dark:bg-black/40">
                        <td colSpan={9} className="px-4 py-4">
                          <ActivityTimeline
                            events={v.recentEvents}
                            emptyMessage="No events recorded for this visitor in the selected range."
                          />
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** First 8 + last 4 characters — enough to tell rows apart without a full UUID eating the column. */
function truncateVisitorId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
