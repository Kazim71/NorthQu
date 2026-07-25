'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client. ANON key only — RLS is the access control.
 *
 * `maxAgeSeconds`, when passed, overrides how long the auth cookie survives
 * a closed browser (default is the library's own 400-day ceiling) — this is
 * the mechanism behind the login page's "Keep me signed in" checkbox, see
 * AuthForm.tsx. Callers that never sign a user in (SignOutButton,
 * ContactForm) don't pass it and get the library default, which is
 * irrelevant to them anyway.
 */
export function createClient(maxAgeSeconds?: number) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    maxAgeSeconds ? { cookieOptions: { maxAge: maxAgeSeconds } } : undefined,
  );
}
