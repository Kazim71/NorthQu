import { logger } from './logger.js';
import { env } from '../config/env.js';
import type { EventRow } from '../modules/events/events.schema.js';

/**
 * Forwards selected events to an n8n webhook — the "Automation" service's
 * actual implementation for now (per the 2026-08-02 product decision: use
 * a free-tier third-party tool rather than build a custom workflow
 * engine). n8n self-hosts for free; this file only needs its webhook URL,
 * nothing n8n-specific beyond that.
 *
 * DELIBERATELY GLOBAL, NOT PER-ORG, for this first version: N8N_WEBHOOK_URL
 * is one env var, not a database column. A real per-org automation setup
 * (different orgs wiring different workflows) needs its own migration and
 * UI — out of scope for making Automation minimally real. Every forwarded
 * payload carries organization_id, so a single n8n instance can still
 * branch per-org inside the workflow itself if needed.
 *
 * NEVER BLOCKS INGESTION: same design rule as geoip.ts's lookupIp() — a
 * slow or unreachable n8n instance must cost nothing on the ingest path.
 * This is fire-and-forget with its own short timeout, not awaited by the
 * caller.
 */

const DEFAULT_TRIGGER_TYPES = new Set(['purchase', 'checkout', 'addToCart']);

function triggerTypes(): Set<string> {
  if (!env.N8N_TRIGGER_EVENT_TYPES) return DEFAULT_TRIGGER_TYPES;
  return new Set(env.N8N_TRIGGER_EVENT_TYPES.split(',').map((s) => s.trim()).filter(Boolean));
}

export function forwardToAutomation(row: EventRow): void {
  if (!env.N8N_WEBHOOK_URL) return;
  if (!triggerTypes().has(row.event_type)) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  fetch(env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
    signal: controller.signal,
  })
    .catch((err) => {
      // Never throws into the caller — this is best-effort forwarding,
      // not a guaranteed-delivery system. A dropped automation trigger is
      // an acceptable cost; a slowed-down or failed event ingestion is not.
      logger.warn('n8n webhook forward failed', {
        event_type: row.event_type,
        error: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => clearTimeout(timeout));
}
