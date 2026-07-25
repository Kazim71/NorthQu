import type { Request } from 'express';

/**
 * The real client IP for an ingestion request.
 *
 * WHY NOT JUST req.socket.remoteAddress: in production this backend runs on
 * Render, which terminates TLS at its edge and proxies to the container. The
 * socket peer is therefore Render's proxy, not the visitor. Render forwards
 * the original client in the standard `X-Forwarded-For` header.
 *
 * `app.set('trust proxy', 1)` (server.ts, already present before this
 * feature) makes Express parse XFF and expose the result as `req.ip`, taking
 * the entry one hop from the right — i.e. the address Render's proxy itself
 * saw. That is the correct choice for a single known proxy: taking the
 * LEFTMOST entry instead would be trivially spoofable, because a client can
 * send its own `X-Forwarded-For` header and Render appends rather than
 * replaces.
 *
 * HONEST LIMITATION: `trust proxy: 1` is right for exactly one proxy hop.
 * Behind an additional CDN (Cloudflare in front of Render, say) the hop
 * count changes and this would return the CDN's egress IP instead of the
 * visitor's. The trust setting — not this function — is what would need
 * updating; see the note in server.ts.
 *
 * Returns null rather than a placeholder when there is no usable public
 * address, which is what makes an "Unknown" location honest downstream.
 */
export function getClientIp(req: Request): string | null {
  // req.ip already accounts for `trust proxy`. Fall back to the raw socket
  // for completeness (e.g. a direct request with no proxy in front).
  const candidate = req.ip ?? req.socket.remoteAddress ?? null;
  if (!candidate) return null;

  const normalized = normalizeIp(candidate);
  if (!normalized) return null;

  // A private/loopback address cannot be geolocated. Returning null here
  // (rather than sending it upstream) avoids a pointless round-trip and,
  // more importantly, avoids the provider's "best guess" for an
  // unroutable address being stored as if it were real.
  if (isPrivateOrReserved(normalized)) return null;

  return normalized;
}

/**
 * Strips the IPv4-mapped IPv6 prefix Node reports on dual-stack sockets
 * (`::ffff:203.0.113.5` -> `203.0.113.5`) and any zone index / port noise.
 */
export function normalizeIp(raw: string): string | null {
  let ip = raw.trim();
  if (!ip) return null;

  // Bracketed IPv6 with port: [::1]:1234
  const bracketed = ip.match(/^\[(.+)\](?::\d+)?$/)?.[1];
  if (bracketed) ip = bracketed;

  // IPv4-mapped IPv6
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) ip = mapped;

  // IPv6 zone index: fe80::1%eth0
  const pct = ip.indexOf('%');
  if (pct !== -1) ip = ip.slice(0, pct);

  return ip.length > 0 ? ip : null;
}

/** RFC1918 / loopback / link-local / CGNAT / IPv6 private ranges. */
export function isPrivateOrReserved(ip: string): boolean {
  if (ip === '::1' || ip === '::') return true;

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
  const lower = ip.toLowerCase();
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;

  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map((p) => Number.parseInt(p, 10));
  const a = octets[0];
  const b = octets[1];
  if (a === undefined || b === undefined) return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this network"
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10

  return false;
}
