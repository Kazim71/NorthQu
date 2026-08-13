/**
 * Content-Security-Policy, built additively rather than copied from a
 * template — each directive exists because something real in this app
 * needs it, and the comment says what:
 *  - script-src/style-src 'unsafe-inline': Next.js's App Router injects
 *    its own hydration payload and (for style-src) some inline styles as
 *    inline <script>/<style> tags with no nonce wired through middleware.
 *    Removing 'unsafe-inline' without adding nonce support would break
 *    the app outright, which is a worse outcome than the (well-understood,
 *    widely-accepted) tradeoff of allowing it. A stricter nonce-based CSP
 *    is a real follow-up, not something to fake here.
 *  - connect-src includes https://*.supabase.co: every dashboard query
 *    goes straight from the browser to Supabase via the anon key
 *    (frontend/src/lib/supabase/client.ts) — the API's own domain is not
 *    involved for reads, so this is not incidentally permissive.
 *  - frame-ancestors 'none': the actual clickjacking defense (more
 *    reliable than X-Frame-Options, which is kept alongside only for
 *    older browsers that don't read CSP).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /features and /product were LeadPulse's marketing pages from when it was
  // the whole company's identity. LeadPulse is now one NorthQu offering,
  // consolidated at /services/leadpulse — these redirect there so no old
  // links or bookmarks 404.
  async redirects() {
    return [
      { source: '/features', destination: '/services/leadpulse', permanent: true },
      { source: '/product', destination: '/services/leadpulse', permanent: true },
    ];
  },
  /**
   * Security headers on every response. Added 2026-08-02 — the backend API
   * got `helmet` earlier, but this dashboard (real session cookies, real
   * contact PII on screen) had none at all until now.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // Explicit deny list rather than the browser default: this app
            // uses none of these, so there is no reason a compromised
            // third-party script loaded on the page should be able to.
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};
export default nextConfig;
