export interface TimelineEvent {
  id: string;
  event_type: string;
  url: string | null;
  created_at: string;
}

/**
 * The event-list UI used inside an expandable table row. Extracted from
 * LeadsTable so AnonymousVisitorsTable can show the same activity trail for
 * an unidentified visitor without duplicating the markup — both tables pass
 * their own `recentEvents` (already the same `{ id, event_type, url,
 * created_at }` shape from queries.ts) straight through.
 */
export function ActivityTimeline({
  events,
  emptyMessage = 'No events recorded yet.',
}: {
  events: TimelineEvent[];
  emptyMessage?: string;
}) {
  return (
    <div>
      <p className="mb-3 text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Recent activity
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
      ) : (
        <ol className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-baseline gap-3 text-sm">
              <span className="w-2 flex-none">
                <span className="block h-1.5 w-1.5 rounded-full bg-cinnamon-500" />
              </span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{event.event_type}</span>
              <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{event.url ?? ''}</span>
              <span className="ml-auto flex-none text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
