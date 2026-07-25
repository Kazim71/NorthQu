import { supabase } from '../../config/supabaseClient.js';
import { TABLES } from '../../lib/tables.js';
import { logger, serializeError } from '../../lib/logger.js';

/**
 * Resolve which tenant a Shopify webhook belongs to, from the store's
 * permanent `*.myshopify.com` domain (the `X-Shopify-Shop-Domain` header).
 *
 * This is the webhook-world equivalent of resolveOrg's api_key lookup — a
 * Shopify request has no `x-api-key`, so the shop domain is the only tenant
 * identifier available. Mapping lives in `organizations.shopify_domain`
 * (migration 0005). Unlike resolveOrg this is not cached: webhook volume is
 * a few per checkout, not one per page view, so a per-call lookup is fine.
 */
export const shopifyRepository = {
  async findOrganizationIdByShopDomain(shopDomain: string): Promise<string | null> {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select('id')
      .eq('shopify_domain', shopDomain)
      .maybeSingle();

    if (error) {
      logger.error('shopify_domain lookup failed', {
        shop_domain: shopDomain,
        ...serializeError(error),
      });
      throw error;
    }

    return data?.id ?? null;
  },
};
