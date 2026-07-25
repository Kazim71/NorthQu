import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { internal } from '../../lib/errors.js';
import { getClientIp } from '../../lib/clientIp.js';
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
    const { eventId } = await eventsService.ingest(organizationId, req.body, {
      ip: getClientIp(req),
      userAgent: req.header('user-agent'),
    });

    // 202, not 201: the row is committed, but downstream work (identity
    // linking, scoring) has not run. The snippet is fire-and-forget and must
    // never wait on any of it. Location/device enrichment DOES now happen
    // inline before the insert — see events.service.ts for why that is safe.
    res.status(202).json({ received: true, event_id: eventId });
  }),
);
