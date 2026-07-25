import { env } from '../config/env.js';
import { logger, serializeError } from './logger.js';

/**
 * IP -> coarse location, for enriching ingested events.
 *
 * PROVIDER CHOICE: ipwho.is (HTTPS, no API key, free tier).
 *
 * Evaluated against the two alternatives before picking:
 *
 *   - MaxMind GeoLite2, self-hosted .mmdb. Genuinely the best answer at
 *     scale — zero latency, no rate limit, no third party in the request
 *     path. Rejected FOR NOW because it needs a licensed account to
 *     download, ships a ~70MB binary that does not belong in git, and must
 *     be re-downloaded roughly weekly to stay accurate: that is a build
 *     step plus a recurring refresh job, i.e. real operational surface for
 *     a feature that currently has no traffic. The swap is deliberately
 *     cheap — implement `lookupIp` against `@maxmind/geoip2-node` and
 *     nothing outside this file changes.
 *   - ip-api.com. Rejected on a hard technical fact, not preference: the
 *     free tier is HTTP-only (verified), so every lookup would send
 *     request data over plaintext from a production backend.
 *
 * WHAT MAKES A THIRD-PARTY CALL ACCEPTABLE IN THE INGESTION PATH:
 *   - Results are cached per IP for 24h (an IP's city does not move), so a
 *     storefront's repeat visitors cost zero upstream calls.
 *   - Concurrent misses for the SAME ip share one in-flight request, so a
 *     burst of events from one new visitor is one lookup, not N.
 *   - Hard timeout, and every failure path resolves to nulls instead of
 *     throwing — enrichment can never fail an event ingestion.
 *   - Failures are negatively cached (shorter TTL) so a persistently
 *     unresolvable IP does not re-hit the provider on every event.
 *
 * NOT IMPLEMENTED: VPN/proxy detection. It requires a paid IP-intelligence
 * feed; free geolocation cannot tell you this. Deliberately out of scope.
 */

export interface GeoLocation {
  city: string | null;
  state: string | null;
  /** ISO-3166 alpha-2, matching the convention already in the events table. */
  country: string | null;
  pincode: string | null;
}

export const EMPTY_GEO: GeoLocation = Object.freeze({
  city: null,
  state: null,
  country: null,
  pincode: null,
});

interface CacheEntry {
  value: GeoLocation;
  expiresAt: number;
}

/**
 * Process-local. With multiple instances each keeps its own copy, which is
 * fine — identical, read-only, self-expiring data. Same reasoning as
 * resolveOrg's api_key cache.
 */
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<GeoLocation>>();

/** Bounds memory if a scraper walks a wide IP range. */
const MAX_CACHE_ENTRIES = 10_000;

function cacheSet(ip: string, value: GeoLocation, ttlSeconds: number): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Map preserves insertion order, so the first key is the oldest write.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(ip, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Exposed for tests and for a future "re-resolve" admin hook. */
export function clearGeoCache(): void {
  cache.clear();
  inFlight.clear();
}

interface IpWhoIsResponse {
  success?: boolean;
  city?: unknown;
  region?: unknown;
  country_code?: unknown;
  postal?: unknown;
}

/** Trim to a non-empty string, else null. Keeps '' out of the database. */
function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

async function fetchFromProvider(ip: string): Promise<GeoLocation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.GEOIP_TIMEOUT_MS);

  try {
    const res = await fetch(
      // Only the fields we store, so the provider does less work and the
      // response is small.
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country_code,postal`,
      { signal: controller.signal, headers: { accept: 'application/json' } },
    );

    if (!res.ok) {
      logger.warn('geoip provider returned non-ok', { ip, status: res.status });
      return EMPTY_GEO;
    }

    const body = (await res.json()) as IpWhoIsResponse;

    // ipwho.is signals a failed lookup with 200 + success:false (e.g. a
    // reserved range). Treat as "unknown", not as an error.
    if (body?.success === false) return EMPTY_GEO;

    return {
      city: str(body.city),
      state: str(body.region),
      country: str(body.country_code),
      pincode: str(body.postal),
    };
  } catch (err) {
    // AbortError (timeout) and network failures both land here. Logged at
    // warn, not error: an occasional unreachable provider is expected
    // traffic, and the caller degrades to "Unknown" rather than failing.
    logger.warn('geoip lookup failed', { ip, ...serializeError(err) });
    return EMPTY_GEO;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves once the lookup finishes OR the soft deadline passes, whichever
 * comes first — but CRUCIALLY does not cancel the lookup on timeout. The
 * in-flight request keeps running and still populates the cache, so the
 * visitor's next event (usually seconds later) is enriched even though this
 * one wasn't. That is what lets ingestion stay fast without permanently
 * losing the enrichment.
 */
function withSoftDeadline(promise: Promise<GeoLocation>, ms: number): Promise<GeoLocation> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(EMPTY_GEO), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(EMPTY_GEO);
      },
    );
  });
}

/**
 * Resolve an IP to a coarse location. Never throws, never fabricates: an
 * unresolvable IP yields all-null, which the dashboard renders as "Unknown".
 *
 * `ip` should already be a normalized PUBLIC address — pass the result of
 * getClientIp(), which returns null for private/loopback ranges.
 *
 * TWO TIMEOUTS, deliberately: `GEOIP_TIMEOUT_MS` aborts the HTTP request
 * itself (a hung connection must not leak), while `GEOIP_MAX_WAIT_MS` is how
 * long the CALLER will wait before proceeding without a location. The second
 * is shorter, so a slow provider costs one unenriched event rather than a
 * slow ingestion endpoint. Pass `maxWaitMs` to override (tests await the
 * full lookup by passing a large value).
 */
export async function lookupIp(
  ip: string | null,
  opts: { maxWaitMs?: number } = {},
): Promise<GeoLocation> {
  if (!env.GEOIP_ENABLED || !ip) return EMPTY_GEO;

  const hit = cache.get(ip);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  // Collapse concurrent misses for the same IP into one upstream call.
  let pending = inFlight.get(ip);

  if (!pending) {
    pending = fetchFromProvider(ip)
      .then((value) => {
        const resolved = value.city !== null || value.country !== null;
        cacheSet(
          ip,
          value,
          resolved ? env.GEOIP_CACHE_TTL_SECONDS : env.GEOIP_NEGATIVE_CACHE_TTL_SECONDS,
        );
        return value;
      })
      .finally(() => {
        inFlight.delete(ip);
      });

    inFlight.set(ip, pending);
  }

  const maxWait = opts.maxWaitMs ?? env.GEOIP_MAX_WAIT_MS;
  return withSoftDeadline(pending, maxWait);
}

/**
 * Await any in-flight lookups. Test-only helper: lets a harness assert on the
 * cache-warming path without racing it.
 */
export async function drainGeoLookups(): Promise<void> {
  await Promise.allSettled([...inFlight.values()]);
}
