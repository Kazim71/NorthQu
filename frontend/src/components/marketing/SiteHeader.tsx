'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoLockup } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MenuIcon, CloseIcon } from '@/components/icons';

const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/#work', label: 'Work' },
  { href: '/about', label: 'About' },
  { href: '/insights', label: 'Insights' },
];

/**
 * Shared across all public marketing pages via (marketing)/layout.tsx.
 *
 * STICKY, not static: `sticky top-0 z-40` — an earlier version had no
 * position class at all, so it simply scrolled away with the page, and
 * its `bg-white/85 backdrop-blur` (styling clearly meant for a header
 * staying put over scrolling content) never had a chance to do anything.
 * `z-40` sits below CursorGlow's `z-[100]` (a decorative overlay that
 * should stay on top of everything) but above ordinary page content.
 *
 * "Log in" is deliberately a small text link, not a button, so it doesn't
 * compete with "Start a Project" — existing LeadPulse customers need a
 * way back into their dashboard, but the company-level site's primary
 * conversion action is starting a new engagement, not logging in.
 *
 * MOBILE NAV (added 2026-08-02): the nav links were previously
 * `hidden sm:flex` with nothing standing in for them below that
 * breakpoint — so on any phone the entire site navigation (Services,
 * Work, About, Insights) was unreachable, and the only routes a mobile
 * visitor could get to were the logo's homepage and the two CTAs. Now a
 * real disclosure menu. This is why the component became 'use client':
 * it needs open/close state. Everything it renders is still static
 * markup, so the cost is a small event handler, not a data fetch.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change — without this, tapping a link swaps the page
  // underneath while the menu stays open covering it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape to close + lock background scroll while the sheet is open, same
  // reasoning as the dashboard drawer (DashboardChrome).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 pt-safe backdrop-blur dark:border-neutral-800/80 dark:bg-black/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* `?home=1` bypasses "/"'s auth-redirect (see (marketing)/page.tsx)
            — this header also renders for an authenticated visitor who
            navigated directly to a marketing page like /about, and the
            logo must show the actual homepage, not bounce them into
            /dashboard. */}
        <Link href="/?home=1" aria-label="NorthQu home">
          <LogoLockup className="h-7" />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-600 transition-colors hover:text-black dark:text-neutral-400 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-sm text-neutral-500 transition-colors hover:text-black dark:text-neutral-500 dark:hover:text-white sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/contact"
            className="hidden rounded-full bg-cinnamon-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400 sm:inline-block"
          >
            Start a Project
          </Link>

          {/* h-11 w-11 ≈ 44px, Apple's Human Interface Guidelines minimum
              touch target. The icon inside is smaller; the hit area is not. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:hidden"
          >
            {open ? <CloseIcon className="pointer-events-none h-5 w-5" /> : <MenuIcon className="pointer-events-none h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-neutral-200 bg-white pb-safe dark:border-neutral-800 dark:bg-black sm:hidden"
        >
          <nav className="mx-auto max-w-6xl px-6 py-3" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block border-b border-neutral-100 py-3.5 text-base text-neutral-700 last:border-0 dark:border-neutral-900 dark:text-neutral-300"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2.5 pb-2">
              <Link
                href="/contact"
                className="rounded-full bg-cinnamon-600 px-5 py-3 text-center text-sm font-medium text-white dark:bg-cinnamon-500"
              >
                Start a Project
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-neutral-200 px-5 py-3 text-center text-sm font-medium text-black dark:border-neutral-800 dark:text-white"
              >
                Log in
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
