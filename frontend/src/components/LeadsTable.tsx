'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, statusTone } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { markLeadMessaged, resetLeadMessaged } from '@/app/dashboard/actions';
import { toCsv, downloadTextFile } from '@/lib/csv';
import type { Lead } from '@/lib/queries';

/**
 * Leads table. Presentational for the read path (receives leads as props and
 * owns only view state), plus a thin WRITE path when `enableActions` is set:
 * the org-admin dashboard passes it to expose "mark messaged / reset", which
 * call Server Actions (see app/dashboard/actions.ts) constrained by RLS. The
 * super-admin's read-only per-org view leaves `enableActions` off, so the
 * same component stays reusable — filter and CSV export are read-only and
 * available in both.
 */

const STATUS_ORDER = ['ready', 'cooldown', 'messaged', 'none'] as const;
const STATUS_LABEL: Record<string, string> = {
  ready: 'Ready',
  cooldown: 'Cooldown',
  messaged: 'Messaged',
  none: 'None',
};

type Filter = 'all' | (typeof STATUS_ORDER)[number];

function isMessagedStatus(status: string): boolean {
  return status === 'messaged' || status === 'cooldown';
}

export function LeadsTable({ leads, enableActions = false }: { leads: Lead[]; enableActions?: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<string, number> = { ready: 0, cooldown: 0, messaged: 0, none: 0 };
    for (const l of leads) c[l.message_status] = (c[l.message_status] ?? 0) + 1;
    return c;
  }, [leads]);

  const filtered = useMemo(
    () => (filter === 'all' ? leads : leads.filter((l) => l.message_status === filter)),
    [leads, filter],
  );

  const colSpan = enableActions ? 7 : 6;

  function handleExport() {
    const headers = ['Name', 'Phone', 'Email', 'City', 'State', 'Country', 'Status', 'Events', 'First seen', 'Last seen'];
    const rows = filtered.map((l) => [
      l.name ?? '', l.phone ?? '', l.email ?? '', l.city ?? '', l.state ?? '', l.country ?? '',
      l.message_status, l.eventCount, l.first_seen ?? '', l.last_seen ?? '',
    ]);
    const suffix = filter === 'all' ? '' : `-${filter}`;
    downloadTextFile(`leads${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  }

  function handleAction(lead: Lead) {
    const undo = isMessagedStatus(lead.message_status);
    setError(null);
    setPendingId(lead.id);
    startTransition(async () => {
      const res = await (undo ? resetLeadMessaged : markLeadMessaged)(lead.id);
      setPendingId(null);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Once the tracking snippet identifies a visitor, they'll appear here with their full activity trail."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar: status filter (with counts) + CSV export */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill label="All" count={leads.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        {STATUS_ORDER.map((s) => (
          <FilterPill
            key={s}
            label={STATUS_LABEL[s]}
            count={counts[s] ?? 0}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
        <button
          onClick={handleExport}
          className="ml-auto rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
        >
          Export CSV
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-brick-300 bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:border-brick-700 dark:bg-brick-900/40 dark:text-brick-300">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-black">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-white text-2xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-black/50 dark:text-neutral-400">
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Events</th>
              <th className="px-5 py-3 font-medium">Last seen</th>
              {enableActions ? <th className="px-5 py-3 text-right font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No leads with status “{filter}”.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const isOpen = expanded === lead.id;
                const undo = isMessagedStatus(lead.message_status);
                const busy = pendingId === lead.id;
                return (
                  <>
                    <tr
                      key={lead.id}
                      onClick={() => setExpanded(isOpen ? null : lead.id)}
                      className="cursor-pointer transition-colors hover:bg-cinnamon-50/60 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-black dark:text-neutral-100">
                          {lead.name ?? 'Unnamed lead'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                        <div className="flex flex-col">
                          {lead.phone ? <span className="tabular-nums">{lead.phone}</span> : null}
                          {lead.email ? <span className="text-xs">{lead.email}</span> : null}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                        {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone(lead.message_status)}>{lead.message_status}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                        {lead.eventCount}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">
                        {lead.last_seen ? new Date(lead.last_seen).toLocaleString() : '—'}
                      </td>
                      {enableActions ? (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(lead);
                            }}
                            disabled={busy}
                            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
                          >
                            {busy ? '…' : undo ? 'Reset' : 'Mark messaged'}
                          </button>
                        </td>
                      ) : null}
                    </tr>

                    {isOpen ? (
                      <tr key={`${lead.id}-detail`} className="bg-white/70 dark:bg-black/40">
                        <td colSpan={colSpan} className="px-5 py-4">
                          <p className="mb-3 text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            Recent activity
                          </p>
                          {lead.recentEvents.length === 0 ? (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              No events recorded for this lead yet.
                            </p>
                          ) : (
                            <ol className="space-y-2">
                              {lead.recentEvents.map((event) => (
                                <li key={event.id} className="flex items-baseline gap-3 text-sm">
                                  <span className="w-2 flex-none">
                                    <span className="block h-1.5 w-1.5 rounded-full bg-cinnamon-500" />
                                  </span>
                                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                    {event.event_type}
                                  </span>
                                  <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                    {event.url ?? ''}
                                  </span>
                                  <span className="ml-auto flex-none text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                                    {new Date(event.created_at).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          )}
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

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-cinnamon-600 px-3.5 py-1.5 text-xs font-medium text-white'
          : 'rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-cinnamon-400 dark:border-neutral-700 dark:text-neutral-300'
      }
    >
      {label} <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
