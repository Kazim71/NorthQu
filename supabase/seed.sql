-- =====================================================================
-- leadpulse — optional dev seed
-- Run AFTER 0001_init_schema.sql, in the Supabase SQL editor (which runs
-- as the `postgres` role and therefore bypasses RLS) or via
-- `supabase db reset` locally.
--
-- BEFORE RUNNING: create the test auth user first, because admin_users.id
-- is an FK to auth.users(id).
--   Supabase Dashboard -> Authentication -> Users -> "Add user"
--     email:    owner@acme-test.dev
--     password: anything you'll remember
--   Copy the generated UUID, then find/replace the placeholder
--   6d08ec3f-fa94-4a1f-8832-6ea2c94d1e23 below with it (plain find/replace, so this
--   file works in the SQL editor as well as psql).
-- Everything else uses fixed UUIDs so the seed is re-runnable and Phase 2
-- curl tests can hard-code ids.
-- =====================================================================

begin;

-- --------------------------------------------------------------
-- organizations — two orgs, so cross-tenant RLS is actually testable
-- --------------------------------------------------------------
-- shopify_domain requires migration 0005. Acme is pre-mapped to a test
-- store so the Shopify checkout webhook can resolve it to this tenant.
insert into public.organizations (id, name, slug, api_key, shopify_domain) values
  ('11111111-1111-1111-1111-111111111111', 'Acme Test Store', 'acme-test',
   'seedapikeyacme000000000000000000000000000000000000', 'acme-test.myshopify.com'),
  ('22222222-2222-2222-2222-222222222222', 'Rival Test Store', 'rival-test',
   'seedapikeyrival00000000000000000000000000000000000', null)
on conflict (id) do nothing;

-- --------------------------------------------------------------
-- admin_users — belongs to Acme only
-- --------------------------------------------------------------
insert into public.admin_users (id, organization_id, email, role) values
  ('6d08ec3f-fa94-4a1f-8832-6ea2c94d1e23', '11111111-1111-1111-1111-111111111111',
   'owner@acme-test.dev', 'owner')
on conflict (id) do nothing;

-- --------------------------------------------------------------
-- contacts — 4 under Acme, 1 under Rival (must stay invisible to Acme)
--
-- message_status is COMPUTED (migration 0006), not stored, so these rows
-- carry only the real INPUTS (events + messaged_at) and the status is
-- derived on read. The four Acme contacts are chosen to exercise all four
-- computed states on the dashboard:
--   Priya  -> ready    (never messaged; addToCart event 2h ago, within 7d)
--   Sam    -> cooldown (messaged 12h ago, within the 48h cooldown window)
--   Alex   -> messaged (messaged 5d ago, older than the cooldown window)
--   Dana   -> none     (never messaged; no events at all)
-- --------------------------------------------------------------
insert into public.contacts
  (id, organization_id, phone, email, name, city, state, country, pincode,
   first_seen, last_seen, messaged_at) values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '+919876543210', 'priya@example.com', 'Priya Nair',
   'Bengaluru', 'Karnataka', 'IN', '560001',
   now() - interval '6 days', now() - interval '2 hours', null),

  ('aaaaaaa1-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   null, 'sam@example.com', 'Sam Delgado',
   'Mumbai', 'Maharashtra', 'IN', '400001',
   now() - interval '2 days', now() - interval '20 minutes', now() - interval '12 hours'),

  ('aaaaaaa1-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111',
   '+919812300004', 'alex@example.com', 'Alex Menon',
   'Kochi', 'Kerala', 'IN', '682001',
   now() - interval '8 days', now() - interval '6 days', now() - interval '5 days'),

  ('aaaaaaa1-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   '+919812300005', 'dana@example.com', 'Dana Roy',
   'Pune', 'Maharashtra', 'IN', '411001',
   now() - interval '40 days', now() - interval '40 days', null),

  ('bbbbbbb2-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222',
   '+919000000000', null, 'Rival Lead',
   'Delhi', 'Delhi', 'IN', '110001',
   now() - interval '1 day', now(), now() - interval '3 days')
on conflict (id) do nothing;

-- --------------------------------------------------------------
-- visitor_identity_map
-- --------------------------------------------------------------
insert into public.visitor_identity_map (visitor_id, organization_id, contact_id) values
  ('vis_acme_001', '11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000001'),
  ('vis_acme_002', '11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000002'),
  ('vis_acme_004', '11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000004'),
  ('vis_rival_001', '22222222-2222-2222-2222-222222222222',
   'bbbbbbb2-0000-0000-0000-000000000001')
on conflict (visitor_id, organization_id) do nothing;

-- --------------------------------------------------------------
-- events — payload shapes match the tracking-snippet contract
-- vis_acme_003 is deliberately anonymous (contact_id null, no identity
-- map row) so Phase 2's /identify backfill has something to link.
-- --------------------------------------------------------------
insert into public.events
  (organization_id, contact_id, visitor_id, event_type, url, metadata,
   city, state, country, pincode, created_at) values

  -- 1. page_view (identified)
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'vis_acme_001', 'page_view', 'https://acme-test.dev/',
   '{"view_data":{"url":"https://acme-test.dev/"},"actionField":{}}'::jsonb,
   'Bengaluru', 'Karnataka', 'IN', '560001', now() - interval '6 days'),

  -- 2. search
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'vis_acme_001', 'search', 'https://acme-test.dev/search?q=running+shoes',
   '{"view_data":{"url":"https://acme-test.dev/search?q=running+shoes"},"actionField":{"list":"search-results","option":"running shoes"},"products":[]}'::jsonb,
   'Bengaluru', 'Karnataka', 'IN', '560001', now() - interval '5 days'),

  -- 3. product_view
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'vis_acme_001', 'product_view', 'https://acme-test.dev/p/sku-1042',
   '{"view_data":{"url":"https://acme-test.dev/p/sku-1042"},"actionField":{"list":"search-results"},"products":[{"name":"Trailblazer Runner","id":"sku-1042","price":"4999.00","brand":"Acme","category":"Footwear/Running","variant":"Blue / 9"}]}'::jsonb,
   'Bengaluru', 'Karnataka', 'IN', '560001', now() - interval '5 days' + interval '3 minutes'),

  -- 4. addToCart
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000001',
   'vis_acme_001', 'addToCart', 'https://acme-test.dev/p/sku-1042',
   '{"view_data":{"url":"https://acme-test.dev/p/sku-1042"},"actionField":{"list":"pdp"},"products":[{"name":"Trailblazer Runner","id":"sku-1042","price":"4999.00","brand":"Acme","category":"Footwear/Running","variant":"Blue / 9","quantity":1}]}'::jsonb,
   'Bengaluru', 'Karnataka', 'IN', '560001', now() - interval '2 hours'),

  -- 5. checkout (with promotion)
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000002',
   'vis_acme_002', 'checkout', 'https://acme-test.dev/checkout',
   '{"view_data":{"url":"https://acme-test.dev/checkout"},"actionField":{"step":2,"option":"UPI"},"products":[{"name":"Cloudstep Trainer","id":"sku-2087","price":"7499.00","brand":"Acme","category":"Footwear/Training","variant":"Black / 10","quantity":1}],"promotions":[{"id":"promo-monsoon","name":"Monsoon 15% Off","creative":"hero-banner","position":"top"}]}'::jsonb,
   'Mumbai', 'Maharashtra', 'IN', '400001', now() - interval '25 minutes'),

  -- 6. purchase
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000002',
   'vis_acme_002', 'purchase', 'https://acme-test.dev/order/confirmed',
   '{"view_data":{"url":"https://acme-test.dev/order/confirmed"},"actionField":{"id":"ORD-90114","option":"UPI"},"products":[{"name":"Cloudstep Trainer","id":"sku-2087","price":"7499.00","brand":"Acme","category":"Footwear/Training","variant":"Black / 10","quantity":1}]}'::jsonb,
   'Mumbai', 'Maharashtra', 'IN', '400001', now() - interval '20 minutes'),

  -- 7. anonymous productClick — no contact yet
  ('11111111-1111-1111-1111-111111111111',
   null,
   'vis_acme_003', 'productClick', 'https://acme-test.dev/c/footwear',
   '{"view_data":{"url":"https://acme-test.dev/c/footwear"},"actionField":{"list":"category-grid","id":"sku-3311"},"products":[{"name":"Summit Hiker","id":"sku-3311","price":"8999.00","brand":"Acme","category":"Footwear/Outdoor","variant":"Brown / 8"}]}'::jsonb,
   'Chennai', 'Tamil Nadu', 'IN', '600001', now() - interval '10 minutes'),

  -- 8. rival org event — must never appear in an Acme query
  ('22222222-2222-2222-2222-222222222222',
   'bbbbbbb2-0000-0000-0000-000000000001',
   'vis_rival_001', 'page_view', 'https://rival-test.dev/',
   '{"view_data":{"url":"https://rival-test.dev/"},"actionField":{}}'::jsonb,
   'Delhi', 'Delhi', 'IN', '110001', now() - interval '30 minutes'),

  -- 9. Alex event 1 day ago — recent activity, but Alex was messaged 5d ago,
  --    so the computed status must still be 'messaged' (messaged_at wins over
  --    the "recent events" ready rule). Proves that precedence.
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaa1-0000-0000-0000-000000000004',
   'vis_acme_004', 'product_view', 'https://acme-test.dev/p/sku-4200',
   '{"view_data":{"url":"https://acme-test.dev/p/sku-4200"},"actionField":{"list":"pdp"},"products":[{"name":"Harbor Deck Shoe","id":"sku-4200","price":"5499.00","brand":"Acme","category":"Footwear/Casual","variant":"Tan / 9"}]}'::jsonb,
   'Kochi', 'Kerala', 'IN', '682001', now() - interval '1 day');

-- --------------------------------------------------------------
-- platform_admins (requires migration 0003)
-- --------------------------------------------------------------
-- Create a SECOND auth user for the super-admin before running this:
--   Dashboard -> Authentication -> Users -> "Add user"
--     email: super@leadcapsule.dev
-- Then find/replace PASTE_SUPER_ADMIN_UUID_HERE below with its UUID.
--
-- This must be a different auth user from the org-admin seeded above.
-- The two roles are mutually exclusive in the UI: a user in platform_admins
-- routes to /super-admin, everyone else routes to /dashboard. Granting both
-- to one account makes the routing ambiguous and the isolation test
-- meaningless.
--
-- Commented out by default so seed.sql stays runnable before 0003 is
-- applied. Uncomment once you have the UUID.
--
-- insert into public.platform_admins (user_id)
-- values ('PASTE_SUPER_ADMIN_UUID_HERE')
-- on conflict (user_id) do nothing;

commit;
