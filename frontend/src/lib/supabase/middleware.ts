import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ABSOLUTE_REAUTH_MAX_AGE_MS,
  LOGIN_AT_COOKIE,
  REAUTH_REASON_PARAM,
  REAUTH_REASON_VALUE,
} from '@/lib/session';

// See server.ts: the cookie contract is an untagged union, so these
// callback params must be annotated rather than inferred.
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the auth session on every request, performs COARSE route
 * gating (is there a session at all?), and enforces the absolute
 * re-authentication ceiling (see lib/session.ts).
 *
 * Deliberately not the ROLE-authorization boundary. Middleware cannot
 * safely query platform_admins/admin_users on every request without a DB
 * round-trip per navigation, so the authoritative role check lives in each
 * page's server component via requirePlatformAdmin()/requireOrgAdmin().
 * Middleware only bounces obviously-unauthenticated traffic to /login.
 *
 * It IS, however, the right place for session-lifetime enforcement — it
 * runs on every navigation and can both read and WRITE cookies (a Server
 * Component's cookies() is read-only), which force-expiring a session
 * requires.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) — it revalidates the JWT against Supabase
  // rather than trusting a cookie that a client could have forged.
  const { data: { user: revalidatedUser } } = await supabase.auth.getUser();
  let user = revalidatedUser;

  // ---------------------------------------------------------------------
  // Absolute re-authentication ceiling — independent of "Keep me signed
  // in" (AuthForm.tsx) and independent of the Supabase refresh token's own
  // lifetime, which auto-renews indefinitely as long as it keeps being
  // used. Without this, a session that stays active never expires. Here,
  // regardless of cookie max-age, a session older than
  // ABSOLUTE_REAUTH_MAX_AGE_MS is force-signed-out on the next navigation.
  //
  // LOGIN_AT_COOKIE is set client-side by AuthForm.tsx at the moment of a
  // successful sign-in — a plain, non-httpOnly cookie is fine here because
  // it carries no secret, only a timestamp, and middleware treats its
  // ABSENCE the same as its EXPIRY (fail closed): a logged-in user with no
  // timestamp (e.g. a session that predates this feature shipping, or a
  // tampered/cleared cookie) is required to sign in again rather than
  // being trusted indefinitely by default. That means every session active
  // when this shipped gets signed out exactly once — expected, not a bug.
  if (user) {
    const loginAtRaw = request.cookies.get(LOGIN_AT_COOKIE)?.value;
    const loginAt = loginAtRaw ? Number(loginAtRaw) : NaN;
    const expired = !Number.isFinite(loginAt) || Date.now() - loginAt > ABSOLUTE_REAUTH_MAX_AGE_MS;

    if (expired) {
      await supabase.auth.signOut();
      user = null;
    }
  }

  const path = request.nextUrl.pathname;

  // DENY-LIST, NOT ALLOW-LIST — deliberately inverted 2026-07-25.
  //
  // This used to allow-list the public marketing pages ('/', '/about',
  // '/contact', '/features', '/product', ...). That broke the moment the
  // marketing site grew: /services, /services/leadpulse, /pricing and
  // /insights were added during the company-repositioning work and never
  // added here, so every logged-out visitor who clicked those header nav
  // links was silently redirected to /login — most of the public site was
  // unreachable. (The stale '/features' and '/product' entries are from
  // when LeadPulse was the whole company identity; both now 308 to
  // /services/leadpulse via next.config.mjs.)
  //
  // Inverting fixes the whole class of bug: the marketing site is
  // public BY DEFAULT, so a new public page needs no change here and can
  // never be accidentally hidden. The authenticated surface is a short,
  // stable list that changes rarely — and failing to list a new private
  // route here does NOT expose it, because every one of those pages calls
  // requireOrgAdmin()/requirePlatformAdmin() server-side and RLS sits
  // underneath that. This function is coarse gating, not the security
  // boundary (see the doc comment above), so biasing it toward
  // availability is the correct trade.
  //
  // /api/** is intentionally NOT gated here: those route handlers do their
  // own auth (getPlatformAdminOrNull) and must answer with a 403 JSON
  // body, not an HTML redirect to /login.
  const AUTHENTICATED_PREFIXES = ['/dashboard', '/super-admin', '/pending'];
  const requiresAuth = AUTHENTICATED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Distinguishes "never logged in" from "session force-expired" so the
    // login page can show a real explanation instead of a bare form —
    // only set when revalidatedUser existed (i.e. this redirect is a
    // consequence of the reauth check above, not a plain anonymous visit).
    if (revalidatedUser) url.searchParams.set(REAUTH_REASON_PARAM, REAUTH_REASON_VALUE);

    const redirectResponse = NextResponse.redirect(url);
    // supabaseResponse may carry Set-Cookie headers from signOut() above
    // (via the setAll callback's closure over supabaseResponse) — those
    // must be forwarded onto the actual response we return, since building
    // a fresh NextResponse.redirect() here does not inherit them.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}
