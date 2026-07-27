export interface TimelineEvent {
  id: string;
  event_type: string;
  url: string | null;
  created_at: string;
}

/**
 * Drops the scheme and any query string so the path stays readable in a
 * narrow column. The FULL url is still what the link navigates to and what
 * the tooltip shows — this only shortens the label, never the destination.
 */
function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${u.host}${path}`;
  } catch {
    // Not an absolute URL (relative path, or malformed) — show as-is rather
    // than hiding it.
    return raw;
  }
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
              <span className="flex-none font-medium text-neutral-800 dark:text-neutral-200">
                {event.event_type}
              </span>
              {/* The visited page, as a real link straight to it.
                  `stopPropagation` because this sits inside a table row whose
                  onClick toggles the expander — without it, opening a page
                  would also collapse the row you opened it from.
                  `noopener noreferrer` on an external target is the standard
                  guard against the opened page reaching back via window.opener. */}
              {event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={event.url}
                  className="truncate text-xs text-cinnamon-700 underline decoration-cinnamon-300 underline-offset-2 transition-colors hover:text-cinnamon-800 hover:decoration-cinnamon-500 dark:text-cinnamon-400 dark:decoration-cinnamon-700 dark:hover:text-cinnamon-300"
                >
                  {prettyUrl(event.url)}
                </a>
              ) : (
                <span className="truncate text-xs text-neutral-400 dark:text-neutral-500">—</span>
              )}
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
