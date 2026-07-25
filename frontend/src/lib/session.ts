/**
 * Session-lifetime policy, shared between the browser client (AuthForm),
 * middleware (Edge runtime), and the login page — plain constants/functions
 * only, no Node-specific APIs, so this file is safe to import from all three.
 *
 * THE GAP THIS CLOSES: @supabase/ssr's own default cookie lifetime is 400
 * days (its DEFAULT_COOKIE_OPTIONS.maxAge — Chrome's own cookie ceiling),
 * applied to every sign-in with no "remember me" distinction and no
 * periodic re-authentication. That means today every login is effectively
 * permanent. Two independent controls fix that:
 *
 *   1. REMEMBER_ME / SESSION_ONLY — how long the auth cookie survives a
 *      CLOSED browser, chosen by the login page's checkbox.
 *   2. ABSOLUTE_REAUTH_MAX_AGE_MS — enforced in middleware regardless of
 *      the above: even a "remembered" session forces a fresh sign-in after
 *      this long. This is what makes "ask to log in again after a period"
 *      real rather than aspirational — it's enforced server-side on every
 *      navigation, not a client-side timer a user could just avoid
 *      triggering by not calling some hook.
 */

/** "Keep me signed in" checked: survives closed-browser restarts for this long. */
export const REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** "Keep me signed in" unchecked: short-lived — effectively gone well before the next calendar day for a typical session. */
export const SESSION_ONLY_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

/**
 * Hard ceiling on how long a session is trusted WITHOUT a fresh sign-in,
 * regardless of "remember me". Enforced in middleware by comparing against
 * LOGIN_AT_COOKIE, not by trusting the Supabase refresh token's own
 * lifetime (which auto-renews indefinitely as long as it's used).
 */
export const ABSOLUTE_REAUTH_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Set client-side (see AuthForm.tsx) at the moment of a successful sign-in,
 * to the same max-age as the Supabase auth cookie it accompanies — so it
 * expires alongside the session it's timing and never outlives it. Read
 * server-side in middleware to enforce ABSOLUTE_REAUTH_MAX_AGE_MS.
 */
export const LOGIN_AT_COOKIE = 'lc_login_at';

/** Query param the middleware attaches when it force-signs-out an expired session, so the login page can explain why. */
export const REAUTH_REASON_PARAM = 'reason';
export const REAUTH_REASON_VALUE = 'session-expired';
