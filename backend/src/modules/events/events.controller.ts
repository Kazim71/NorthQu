import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { internal } from '../../lib/errors.js';
import { getClientIp } from '../../lib/clientIp.js';
import { logger } from '../../lib/logger.js';
import { eventsService } from './events.service.js';

export const eventsRouter = Router();

/**
 * POST /api/events
 *
 * Thin by design: read the request, call the service, shape the response.
 * No validation, no database access, no branching on payload contents.
 */
eventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
      // Unreachable while resolveOrg is mounted ahead of this router.
      // Guarding anyway: a middleware reorder should fail loudly here, not
      // silently write rows with an undefined organization_id.
      throw internal('Organization was not resolved for this request');
    }

    // Enrichment inputs are read from the REQUEST, not the payload: a
    // visitor's browser must not be able to declare its own location.
    const clientIp = getClientIp(req);

    // Temporary diagnostic: ip_address has been consistently null on every
    // ingested event across two live tenants, with no corresponding "geoip
    // lookup failed" warning — meaning getClientIp() itself is returning
    // null, not that the geo provider is failing. This makes the mismatch
    // (if any) between the raw X-Forwarded-For chain and what `trust proxy: 1`
    // selects from it visible directly in the logs. Remove once resolved.
    if (!clientIp) {
      logger.warn('client ip resolution failed', {
        xff_header: req.header('x-forwarded-for') ?? null,
        express_req_ip: req.ip ?? null,
        socket_remote_address: req.socket.remoteAddress ?? null,
      });
    }

    const { eventId } = await eventsService.ingest(organizationId, req.body, {
      ip: clientIp,
      userAgent: req.header('user-agent'),
    });

    // 202, not 201: the row is committed, but downstream work (identity
    // linking, scoring) has not run. The snippet is fire-and-forget and must
    // never wait on any of it. Location/device enrichment DOES now happen
    // inline before the insert — see events.service.ts for why that is safe.
    res.status(202).json({ received: true, event_id: eventId });
  }),
);
