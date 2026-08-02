import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';
import { env } from '../config/env.js';
import { TABLES } from '../lib/tables.js';
import { unauthorized, serviceUnavailable } from '../lib/errors.js';
import { logger, serializeError } from '../lib/logger.js';

const API_KEY_HEADER = 'x-api-key';

interface CacheEntry {
  /** null = key is known-invalid. Cached too, see below. */
  organizationId: string | null;
  /**
   * Platform-admin kill switch (organizations.ingestion_paused, migration
   * 0010). Cached alongside organizationId so pausing an org doesn't cost
   * an extra query per request — it just means a paused org can take up to
   * ORG_CACHE_TTL_SECONDS to actually stop accepting events after the
   * toggle flips, which is an acceptable staleness window for an abuse/
   * incident kill switch, not a security boundary.
   */
  ingestionPaused: boolean;
  expiresAt: number;
}

/**
 * In-memory api_key -> organization_id cache.
 *
 * This middleware runs on every ingestion request, so an uncached lookup
 * would mean one Postgres round-trip per tracked event. After the first hit
 * per org, resolution is an O(1) Map read.
 *
 * Negative results are cached too, with the same TTL: without that, a
 * misconfigured or malicious snippet hammering a bad key would bypass the
 * cache entirely and put a query on the database per request — the exact
 * load the cache exists to prevent.
 *
 * Process-local. With more than one instance each keeps its own copy, which
 * is fine (identical, read-only, self-expiring data). Swap for Redis only
 * if key revocation needs to propagate faster than the TTL.
 */
const cache = new Map<string, CacheEntry>();

const ttlMs = env.ORG_CACHE_TTL_SECONDS * 1000;

/** Exposed for tests and for a future admin "revoke key" hook. */
export function invalidateOrgCache(apiKey?: string): void {
  if (apiKey) cache.delete(apiKey);
  else cache.clear();
}

async function lookupOrganization(
  apiKey: string,
): Promise<{ organizationId: string | null; ingestionPaused: boolean }> {
  const cached = cache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { organizationId: cached.organizationId, ingestionPaused: cached.ingestionPaused };
  }

  const { data, error } = await supabase
    .from(TABLES.ORGANIZATIONS)
    .select('id, ingestion_paused')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (error) {
    // Do not cache infrastructure failures as "invalid key" — that would
    // turn a transient blip into 60s of 401s for a legitimate tenant.
    logger.error('organization lookup failed', serializeError(error));
    throw error;
  }

  const organizationId = data?.id ?? null;
  const ingestionPaused = data?.ingestion_paused ?? false;
  cache.set(apiKey, { organizationId, ingestionPaused, expiresAt: Date.now() + ttlMs });
  return { organizationId, ingestionPaused };
}

export async function resolveOrg(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header(API_KEY_HEADER);
    const apiKey = typeof header === 'string' ? header.trim() : '';

    if (!apiKey) {
      next(unauthorized('Missing x-api-key header'));
      return;
    }

    const { organizationId, ingestionPaused } = await lookupOrganization(apiKey);

    if (!organizationId) {
      // Deliberately identical message to the missing-key case: telling a
      // caller that a key is well-formed but unknown is a probing oracle.
      logger.warn('rejected unknown api key', { api_key_prefix: apiKey.slice(0, 6) });
      next(unauthorized());
      return;
    }

    if (ingestionPaused) {
      // Deliberately after key resolution (so we know which org this is,
      // for the log line) but before anything is written. Existing data
      // stays fully readable through the dashboard — this only blocks new
      // ingestion, a platform-admin kill switch for one tenant.
      logger.warn('rejected event — ingestion paused for this organization', { organizationId });
      next(serviceUnavailable('Ingestion is currently paused for this organization'));
      return;
    }

    req.organizationId = organizationId;
    next();
  } catch (err) {
    next(err);
  }
}
