import { badRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { lookupIp } from '../../lib/geoip.js';
import { identifyRepository, type IdentifyResult } from './identify.repository.js';
import { identifyPayloadSchema } from './identify.schema.js';

export const identifyService = {
  /**
   * Links an anonymous visitor to a real contact.
   *
   * The three writes are atomic — see identify.repository.ts for why they
   * live in a Postgres function rather than being sequenced here.
   *
   * GEO ENRICHMENT (phase 6): the contact's city/state/country/pincode are
   * filled from the request IP when the caller did not supply them. Caller-
   * supplied values always WIN — a checkout form's real shipping address is
   * better data than an IP guess, and the Shopify webhook path passes exactly
   * that. The IP lookup is a fallback for the plain snippet `identify()` call,
   * which has no address to send. identify_visitor() itself coalesces against
   * the existing row, so a null here never erases a known value.
   *
   * Device is deliberately NOT propagated to `contacts`: one contact browses
   * from many devices over time, so a single column there would be a
   * last-write-wins half-truth. Device lives per-event, where it is accurate,
   * and the dashboard aggregates it from there.
   */
  async identify(
    organizationId: string,
    rawPayload: unknown,
    context: { ip: string | null } = { ip: null },
  ): Promise<IdentifyResult> {
    const parsed = identifyPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      throw badRequest(
        'Identify payload failed validation',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const payload = parsed.data;

    // Only spend a lookup if there is actually a gap to fill.
    const needsGeo =
      !payload.city || !payload.state || !payload.country || !payload.pincode;
    const geo = needsGeo ? await lookupIp(context.ip) : null;

    const enriched = geo
      ? {
          ...payload,
          city: payload.city ?? geo.city ?? undefined,
          state: payload.state ?? geo.state ?? undefined,
          country: payload.country ?? geo.country ?? undefined,
          pincode: payload.pincode ?? geo.pincode ?? undefined,
        }
      : payload;

    const result = await identifyRepository.identify(organizationId, enriched);

    logger.info('visitor identified', {
      org_id: organizationId,
      visitor_id: payload.visitor_id,
      contact_id: result.contactId,
      linked_events: result.linkedEvents,
      geo_filled_from_ip: Boolean(geo && (geo.city || geo.country)),
    });

    return result;
  },
};
