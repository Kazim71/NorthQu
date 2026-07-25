'use client';

import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

/**
 * Inertial/smooth scrolling for the marketing site only — pairs with the
 * existing CursorGlow effect as part of this site's "premium" polish.
 * Deliberately NOT used on /dashboard or /super-admin: momentum scrolling
 * over data tables and long lists tends to feel disorienting rather than
 * premium, so the dashboard keeps native scroll.
 *
 * `root` mounts a single global Lenis instance for the page (rather than
 * wrapping a scroll container), which is the correct mode for a normal
 * document-flow site like this one.
 *
 * LERP-ONLY, NO `duration`: Lenis's own animate loop (packages/core/src/
 * animate.ts) checks `duration` first — if it's set, `lerp` is ignored
 * completely, and it eases from the CURRENT scroll position to the target
 * over that many seconds. Every wheel tick calls scrollTo() again with a
 * NEW target, which restarts that tween from time 0. During continuous
 * scrolling the tween keeps getting cancelled and restarted before it ever
 * finishes, so the page perpetually "chases" a stale multi-hundred-ms ease —
 * that reads as laggy/delayed, not smooth. (Confirmed by reading Lenis's
 * source directly, not guessed — an earlier version of this file passed
 * both `lerp` and `duration`, which triggered exactly this.) Passing only
 * `lerp` uses the exponential-damping path instead: each frame moves a
 * fixed fraction of the remaining distance, so input keeps up with the
 * page continuously — the standard "responsive smooth scroll" setup.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.1 }}>
      {children}
    </ReactLenis>
  );
}
