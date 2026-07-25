'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LOGIN_AT_COOKIE,
  REMEMBER_ME_MAX_AGE_SECONDS,
  SESSION_ONLY_MAX_AGE_SECONDS,
} from '@/lib/session';

/**
 * Email/password auth against Supabase Auth.
 *
 * Note what this component does NOT do: it never decides where you land.
 * It signs you in and calls router.refresh(), then the server component at
 * "/" resolves the role from the database and redirects. Deciding the
 * destination here would mean trusting the browser with an authorization
 * decision.
 *
 * "Keep me signed in" (login only): controls how long the Supabase auth
 * cookie survives a CLOSED browser (createClient()'s maxAgeSeconds — see
 * lib/supabase/client.ts). It does NOT bypass the separate absolute
 * re-authentication ceiling enforced in middleware.ts: even a "kept signed
 * in" session forces a fresh login after ABSOLUTE_REAUTH_MAX_AGE_MS
 * (lib/session.ts), which this component cannot see or influence — that's
 * deliberate, the same reasoning as not deciding the post-login
 * destination here: a security boundary shouldn't be something the client
 * can quietly opt out of.
 *
 * WORKAROUND, CONFIRMED NECESSARY BY READING THE INSTALLED LIBRARY SOURCE
 * (@supabase/ssr@0.5.2, node_modules/@supabase/ssr/dist/main/cookies.js,
 * the browser storage adapter's setItem): its setCookieOptions unconditionally
 * does `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge` AFTER spreading
 * `options?.cookieOptions` — i.e. it silently discards whatever maxAge
 * createBrowserClient() was given and always writes the library's own
 * 400-day default. Confirmed live: with the fix below removed, a "Keep me
 * signed in" cookie and an unchecked one both came out at 400 days. Rather
 * than patch node_modules (fragile — lost on every reinstall) or bump 7
 * minor versions of an auth library mid-fix (real regression risk on the
 * most safety-critical subsystem in the app, for a one-line issue), this
 * re-applies the correct Max-Age to the SAME cookie(s) the library just
 * wrote, using document.cookie directly, immediately after sign-in
 * succeeds. Overwriting a cookie by name/path always replaces its
 * attributes, including Max-Age — this doesn't touch the cookie's value,
 * so the session token itself is untouched. `applyAuthCookieMaxAge()`
 * matches every `sb-*-auth-token` cookie AND its `.0`, `.1`, ... chunk
 * suffixes (the library splits large session payloads across multiple
 * cookies — see createChunks/isChunkLike in the same source file).
 */
function applyAuthCookieMaxAge(maxAgeSeconds: number): void {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:';
  for (const pair of document.cookie.split('; ')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq);
    if (!/^sb-.+-auth-token(\.\d+)?$/.test(name)) continue;
    const value = pair.slice(eq + 1);
    document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; samesite=lax${secure ? '; secure' : ''}`;
  }
}
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const maxAge =
      mode === 'login'
        ? rememberMe
          ? REMEMBER_ME_MAX_AGE_SECONDS
          : SESSION_ONLY_MAX_AGE_SECONDS
        : REMEMBER_ME_MAX_AGE_SECONDS; // signup has no checkbox — default to remembered
    const supabase = createClient(maxAge);

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      setPending(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      // With email confirmation enabled there is no session yet.
      if (!data.session) {
        setNotice('Check your email to confirm your account, then sign in.');
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }
    }

    // See applyAuthCookieMaxAge()'s doc comment above: the library ignores
    // createClient()'s maxAge, so the correct lifetime has to be re-applied
    // by hand to the cookie(s) it just wrote.
    applyAuthCookieMaxAge(maxAge);

    // Timestamps this sign-in for middleware's absolute-reauth check. Given
    // the SAME max-age as the auth cookie it accompanies, so it always
    // expires alongside (never outlives) the session it's timing.
    document.cookie = `${LOGIN_AT_COOKIE}=${Date.now()}; path=/; max-age=${maxAge}; samesite=lax`;

    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        required
      />

      {mode === 'login' ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-cinnamon-600 focus:ring-cinnamon-500 dark:border-neutral-700 dark:bg-black"
          />
          Keep me signed in
        </label>
      ) : null}

      {error ? (
        <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-cinnamon-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-cinnamon-400 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
      />
    </label>
  );
}
