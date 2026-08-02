import { badRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { lookupIp } from '../../lib/geoip.js';
import { parseUserAgent } from '../../lib/userAgent.js';
import { forwardToAutomation } from '../../lib/automation.js';
import { eventsRepository } from './events.repository.js';
import { eventPayloadSchema, toEventRow } from './events.schema.js';

export interface IngestResult {
  eventId: string;
}

/** Request facts the enrichment is derived from. Never client-declared data. */
export interface RequestContext {
  /** Normalized public client IP, or null (private range / unavailable). */
  ip: string | null;
  userAgent: string | undefined;
}

export const eventsService = {
  /**
   * validate -> enrich -> map -> insert.
   *
   * ENRICHMENT ORDERING: the geo lookup happens AFTER validation, so a
   * malformed payload is rejected without spending an upstream call, and
   * BEFORE the insert, so the row lands complete rather than needing a
   * second write. It cannot fail the request — lookupIp() resolves to nulls
   * on timeout/error rather than throwing (see geoip.ts), and is cached +
   * in-flight-deduped per IP so repeat visitors cost nothing.
   *
   * TODO(idempotency): a network retry from the snippet writes the event
   * twice. Accepted for the MVP — duplicate page_views skew counts but do
   * not corrupt identity resolution. When it matters, have the snippet send
   * a client-generated event_id and add a unique index on
   * (organization_id, event_id) with an ON CONFLICT DO NOTHING insert.
   */
  async ingest(
    organizationId: string,
    rawPayload: unknown,
    context: RequestContext = { ip: null, userAgent: undefined },
  ): Promise<IngestResult> {
    const parsed = eventPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      throw badRequest(
        'Event payload failed validation',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const [geo, device] = await Promise.all([
      lookupIp(context.ip),
      // Synchronous, but wrapped so both resolve together and the shape
      // stays uniform if UA parsing ever needs I/O.
      Promise.resolve(parseUserAgent(context.userAgent)),
    ]);

    const row = toEventRow(organizationId, parsed.data, { geo, device, ip: context.ip });
    const eventId = await eventsRepository.insert(row);

    // Fire-and-forget, after the row is safely written — see automation.ts
    // for why this can never slow down or fail an ingest request.
    forwardToAutomation(row);

    logger.info('event ingested', {
      org_id: organizationId,
      visitor_id: row.visitor_id,
      event_type: row.event_type,
      event_id: eventId,
      // Logged so a run of null enrichment is diagnosable from logs alone
      // (unresolvable IP vs. disabled vs. provider failure).
      geo_resolved: geo.country !== null,
      device_type: device.type,
    });

    return { eventId };
  },
};
