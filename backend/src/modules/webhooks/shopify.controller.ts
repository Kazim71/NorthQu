import { Router, raw } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { AppError, unauthorized } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { verifyShopifyHmac } from './shopify.hmac.js';
import { shopifyService } from './shopify.service.js';

export const shopifyWebhookRouter = Router();

const HMAC_HEADER = 'x-shopify-hmac-sha256';
const SHOP_DOMAIN_HEADER = 'x-shopify-shop-domain';
const TOPIC_HEADER = 'x-shopify-topic';

/**
 * POST /api/webhooks/shopify/checkout
 *
 * Receives a Shopify `orders/create` (or `checkouts/create`) webhook and
 * auto-identifies the visitor by reusing identify_visitor().
 *
 * `raw()` (not the app-global express.json) parses the body to a Buffer so
 * HMAC verification runs on the exact bytes Shopify signed. This route is
 * mounted OUTSIDE the /api tenant router on purpose — Shopify sends no
 * `x-api-key` (so resolveOrg can't run) and no `visitor_id` in the body (so
 * the rate limiter would key oddly). The tenant is resolved from the shop
 * domain instead.
 *
 * Status contract:
 *   401 — signature missing or invalid (or no shop domain header)
 *   503 — SHOPIFY_WEBHOOK_SECRET not configured (fail closed; never treat a
 *         missing secret as a pass)
 *   200 — authentic request. Body's `identified` flag says whether a contact
 *         was linked; see shopify.service.ts for why business-logic gaps ack
 *         with 200 rather than a retry-triggering error.
 */
shopifyWebhookRouter.post(
  '/checkout',
  raw({ type: 'application/json', limit: '100kb' }),
  asyncHandler(async (req, res) => {
    const secret = env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
      // Fail closed: with no secret there is no way to authenticate the
      // request, so we must reject rather than process it.
      logger.error('shopify webhook received but SHOPIFY_WEBHOOK_SECRET is not set');
      throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Shopify webhook processing is not configured');
    }

    // With express.raw, req.body is a Buffer of the exact request bytes.
    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const providedHmac = req.header(HMAC_HEADER);

    if (!verifyShopifyHmac(rawBody, providedHmac, secret)) {
      // Identical message whether the header is absent or wrong — same
      // no-oracle reasoning as resolveOrg's api_key handling.
      throw unauthorized('Invalid webhook signature');
    }

    const shopDomain = req.header(SHOP_DOMAIN_HEADER)?.trim();
    if (!shopDomain) {
      throw unauthorized('Invalid webhook signature');
    }
    const topic = req.header(TOPIC_HEADER)?.trim() ?? 'unknown';

    // Signature already proved authenticity; a malformed JSON body now is a
    // genuine 400 (INVALID_JSON via the shared error handler shape).
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Webhook body is not valid JSON');
    }

    const result = await shopifyService.processCheckout({ shopDomain, topic, payload });

    if (result.identified) {
      res.status(200).json({
        received: true,
        identified: true,
        contact_id: result.contactId,
        linked_events: result.linkedEvents,
      });
      return;
    }

    // Acknowledged but not linked — 200 so Shopify doesn't retry, with the
    // reason for operator visibility.
    res.status(200).json({ received: true, identified: false, reason: result.reason });
  }),
);
