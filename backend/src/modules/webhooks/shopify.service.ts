import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { identifyPayloadSchema } from '../identify/identify.schema.js';
import { identifyRepository } from '../identify/identify.repository.js';
import { shopifyRepository } from './shopify.repository.js';
import { extractIdentity } from './shopify.parser.js';

/**
 * Result of processing one authenticated (HMAC-valid) Shopify webhook.
 *
 * Note there is no error variant for business-logic gaps: an authentic
 * webhook we simply can't correlate (no visitor_id, an unmapped store, only
 * anonymous checkout) is NOT a failure to retry — retrying will produce the
 * identical un-correlatable payload forever. The controller returns 200 for
 * every one of these with the `reason` attached, so Shopify stops retrying,
 * while the event is logged for operator visibility. Only two things return
 * non-2xx (in the controller): a bad signature (401) and an unconfigured
 * secret (503).
 */
export type ShopifyWebhookResult =
  | { identified: true; contactId: string; linkedEvents: number }
  | { identified: false; reason: ShopifySkipReason };

export type ShopifySkipReason =
  | 'unmapped_shop_domain'
  | 'missing_visitor_id'
  | 'missing_contact_identifier'
  | 'merge_conflict';

interface ProcessInput {
  shopDomain: string;
  topic: string;
  payload: unknown;
}

export const shopifyService = {
  async processCheckout({ shopDomain, topic, payload }: ProcessInput): Promise<ShopifyWebhookResult> {
    const organizationId = await shopifyRepository.findOrganizationIdByShopDomain(shopDomain);
    if (!organizationId) {
      // Authentic (signed) webhook from a store we haven't mapped to a
      // tenant. A config gap, not an attack — log loudly, ack with 200 so
      // Shopify doesn't retry a request that can never succeed until an
      // operator sets organizations.shopify_domain.
      logger.error('shopify webhook from unmapped store', { shop_domain: shopDomain, topic });
      return { identified: false, reason: 'unmapped_shop_domain' };
    }

    const identity = extractIdentity(payload as Parameters<typeof extractIdentity>[0]);

    // The whole point of the webhook is linking this checkout to the
    // visitor's prior anonymous behavior. Without the visitor_id (which the
    // storefront must inject into note_attributes — see
    // shopify-webhook-integration.md) there is nothing to link to.
    if (!identity.visitor_id) {
      logger.warn('shopify webhook missing visitor_id', {
        org_id: organizationId,
        shop_domain: shopDomain,
        topic,
      });
      return { identified: false, reason: 'missing_visitor_id' };
    }

    // Reuse the exact same validation /api/identify applies (email format,
    // field lengths, and the phone-or-email requirement) rather than a
    // second, drifting copy.
    const parsed = identifyPayloadSchema.safeParse(identity);
    if (!parsed.success) {
      logger.warn('shopify webhook identity failed validation', {
        org_id: organizationId,
        shop_domain: shopDomain,
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return { identified: false, reason: 'missing_contact_identifier' };
    }

    try {
      // Reuse the atomic identify_visitor() path — same RPC /api/identify
      // uses, so contact upsert + identity-map + event backfill stay in one
      // transaction and there is exactly one implementation of that logic.
      const result = await identifyRepository.identify(organizationId, parsed.data);
      logger.info('shopify webhook identified visitor', {
        org_id: organizationId,
        shop_domain: shopDomain,
        topic,
        visitor_id: parsed.data.visitor_id,
        contact_id: result.contactId,
        linked_events: result.linkedEvents,
      });
      return { identified: true, contactId: result.contactId, linkedEvents: result.linkedEvents };
    } catch (err) {
      // A merge conflict (phone matches one contact, email another) is a real
      // data-modeling question (tracked in docs/TODO.md), not a transient
      // fault. Ack it so Shopify stops retrying; the checkout is preserved in
      // Shopify regardless and can be reconciled once merge support lands.
      if (err instanceof AppError && err.code === 'CONFLICT') {
        logger.warn('shopify webhook hit a contact merge conflict', {
          org_id: organizationId,
          shop_domain: shopDomain,
          visitor_id: parsed.data.visitor_id,
        });
        return { identified: false, reason: 'merge_conflict' };
      }
      // Anything else (RPC/infra failure) IS worth a retry — rethrow so the
      // controller surfaces a 500 and Shopify redelivers.
      throw err;
    }
  },
};
