/**
 * A fixed-locale date/time formatter — never `.toLocaleString()` with no
 * arguments. Every component that renders one is 'use client' but still
 * gets server-rendered for the initial HTML (standard Next.js SSR); an
 * unpinned `toLocaleString()` reads the RUNNING PROCESS's default locale,
 * which differs between the Node server (whatever the OS/container
 * defaults to) and the visitor's browser — producing genuinely different
 * strings for the identical timestamp (e.g. server "2/8/2026" DD/MM vs.
 * browser "8/2/2026" MM/DD). That's a real React hydration error, not a
 * cosmetic one — confirmed live via a headless-browser console capture
 * during a mobile audit (2026-08-02), not assumed. Pinning 'en-US' makes
 * server and client agree no matter what locale either machine runs.
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
