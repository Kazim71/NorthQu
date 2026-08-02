'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * A thin top-of-page progress bar for App Router navigations — dashboard
 * <-> summary, super-admin's org drill-down, login -> dashboard, etc.
 *
 * Why this exists: Next 14's App Router gives no built-in "navigation
 * started" signal (that's a Next 15 feature, useLinkStatus — this project
 * is pinned to 14.2.15). Without it, clicking a nav link shows nothing at
 * all until the destination's data finishes loading, which is what read as
 * "not smooth" — a real gap, not a perception problem, on any route whose
 * Server Component does a live Supabase fetch (i.e. every dashboard page,
 * all `force-dynamic`).
 *
 * Mechanism: intercept same-origin, same-tab <a> clicks to START the bar
 * immediately (before the framework has done anything), then use
 * pathname/searchParams as the completion signal — App Router only commits
 * those after the new page's data is ready, so that change IS "done".
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const creepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  function clearTimers() {
    if (creepRef.current) clearInterval(creepRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
  }

  function start() {
    clearTimers();
    setVisible(true);
    setWidth(15);
    // Creeps toward 90% while waiting so a slow navigation doesn't look
    // stuck at the starting value — never reaches 100% on its own, that
    // only happens once the destination actually commits (below).
    creepRef.current = setInterval(() => {
      setWidth((w) => (w >= 90 ? w : w + (90 - w) * 0.15));
    }, 200);
  }

  function finish() {
    clearTimers();
    setWidth(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 200);
  }

  useEffect(() => {
    // Skip the very first commit (page load, not a navigation) so there's
    // no flash of the bar completing on initial render.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (!href || target === '_blank' || anchor.hasAttribute('download')) return;
      if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;

      // A link to the CURRENT path (e.g. a filter pill toggling a search
      // param back to its current value) may not change pathname/params at
      // all — bail out after a short grace period rather than sit at 90%
      // forever waiting for a "completion" that isn't coming.
      start();
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 4000);
    }

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[200] h-0.5 bg-cinnamon-500 transition-[width,opacity] duration-200 ease-out dark:bg-cinnamon-400"
      style={{ width: `${width}%` }}
    />
  );
}
