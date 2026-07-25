-- =====================================================================
-- leadpulse — Phase 5: Shopify checkout webhook → auto-identify
--
-- A Shopify webhook never carries our tenant `x-api-key`. It identifies
-- the sending store only by the `X-Shopify-Shop-Domain` header (e.g.
-- `acme-test.myshopify.com`). To route an incoming checkout/order webhook
-- to the correct tenant, we map that permanent `*.myshopify.com` domain to
-- an organization here.
--
-- Apply AFTER 0004, in the Supabase SQL editor, before the seed if you want
-- the seed's Acme store pre-mapped (the seed sets acme-test.myshopify.com).
-- =====================================================================

-- The store's permanent myshopify.com domain (NOT the customer-facing
-- vanity domain, which can change). Free text — Shopify assigns it once and
-- it never changes for the life of the store.
alter table public.organizations
  add column if not exists shopify_domain text;

-- One Shopify store belongs to at most one org. Partial unique index so the
-- many orgs with no store connected yet (NULL) don't collide with each other
-- — only real, non-null domains are constrained to be unique.
create unique index if not exists organizations_shopify_domain_key
  on public.organizations (shopify_domain)
  where shopify_domain is not null;
