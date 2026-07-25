-- =====================================================================
-- leadpulse — Phase 6: ingestion enrichment + anonymous-visitor visibility
--
-- Two independent pieces, applied together because the dashboard's new
-- Anonymous Visitors view reads the columns the enrichment writes:
--
--   1. events.device_browser / device_os / device_type — parsed from the
--      request's User-Agent header at ingestion time. Nullable, because
--      every row written before this migration legitimately has no such
--      data and must stay distinguishable from "we looked and couldn't
--      tell" (also null). Never back-filled with a guess.
--
--   2. get_anonymous_visitors() — one row per unique visitor_id that has
--      events with NO linked contact, aggregated, date-range scoped.
--
-- NOTE ON city/state/country/pincode: those columns already exist on
-- `events` (0001) and were always null because enrichment was deferred.
-- No schema change needed for them — the backend now populates them.
--
-- Apply AFTER 0006, in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Device columns on events
-- ---------------------------------------------------------------------
-- Free text, not enums: the set of browsers/OSes is open-ended and a new
-- one must never require a migration. `device_type` is the only
-- low-cardinality one ('desktop' | 'mobile' | 'tablet' | ...), but it is
-- still left unconstrained for the same reason event_type is (see 0001).
alter table public.events
  add column if not exists device_browser text,
  add column if not exists device_os      text,
  add column if not exists device_type    text;

-- Backs the Summary page's device-breakdown widget, which counts by
-- device_type within an org. Partial: rows predating enrichment are null
-- and never participate in the breakdown, so they don't belong in the index.
create index if not exists events_org_device_type_idx
  on public.events (organization_id, device_type)
  where device_type is not null;

-- Backs the anonymous-visitor aggregation below: filter to one org's
-- unlinked events within a time range. Partial on `contact_id is null`
-- because that is exactly the population the view cares about, which keeps
-- the index far smaller than the full table once most events are identified.
create index if not exists events_org_anon_created_idx
  on public.events (organization_id, created_at desc)
  where contact_id is null;

-- ---------------------------------------------------------------------
-- 2. get_anonymous_visitors()
-- ---------------------------------------------------------------------
-- One row per unique visitor_id whose events are NOT linked to a contact.
--
-- A FUNCTION rather than a view, specifically so the date range can be a
-- parameter: filtering events BEFORE aggregation is what makes
-- `event_count` honest for the selected range. A view would have to be
-- filtered on its already-aggregated output, which would show a visitor's
-- all-time event count while claiming to be range-scoped.
--
-- SECURITY INVOKER (the default — deliberately NOT `security definer`):
-- the body reads public.events, so the caller's own RLS policy applies.
-- An org admin therefore sees only their own tenant's visitors, enforced
-- by the same events_select_own_org policy as every other read; a platform
-- admin's cross-org policy also still applies, which is why callers must
-- keep passing an explicit p_organization_id.
--
-- Every reference below is alias-qualified (`e.`) on purpose: the RETURNS
-- TABLE output names (visitor_id, city, ...) collide with the source column
-- names, and an unqualified reference to one of those would be ambiguous.
create or replace function public.get_anonymous_visitors(
  p_organization_id uuid,
  p_from            timestamptz default null,
  p_to              timestamptz default null
)
returns table (
  visitor_id     text,
  first_seen     timestamptz,
  last_seen      timestamptz,
  event_count    bigint,
  city           text,
  state          text,
  country        text,
  device_browser text,
  device_os      text,
  device_type    text
)
language sql
stable
as $$
  select
    e.visitor_id,
    min(e.created_at) as first_seen,
    max(e.created_at) as last_seen,
    count(*)::bigint  as event_count,
    -- Latest NON-NULL value wins for each enrichment field. A visitor's
    -- early events may predate enrichment (or the lookup may have failed
    -- for one request) while later ones succeeded; taking the most recent
    -- real value is more useful than the most recent value, which could be
    -- null. Still never invents one: all-null in, null out -> "Unknown".
    (array_agg(e.city           order by e.created_at desc) filter (where e.city           is not null))[1] as city,
    (array_agg(e.state          order by e.created_at desc) filter (where e.state          is not null))[1] as state,
    (array_agg(e.country        order by e.created_at desc) filter (where e.country        is not null))[1] as country,
    (array_agg(e.device_browser order by e.created_at desc) filter (where e.device_browser is not null))[1] as device_browser,
    (array_agg(e.device_os      order by e.created_at desc) filter (where e.device_os      is not null))[1] as device_os,
    (array_agg(e.device_type    order by e.created_at desc) filter (where e.device_type    is not null))[1] as device_type
  from public.events e
  where e.contact_id is null
    and e.organization_id = p_organization_id
    and (p_from is null or e.created_at >= p_from)
    and (p_to   is null or e.created_at <= p_to)
  group by e.visitor_id
  order by max(e.created_at) desc
$$;

-- The dashboard calls this as the logged-in user (authenticated);
-- service_role is granted for backend/verification use. `anon` is
-- deliberately NOT granted — the tracking snippet has no business reading
-- aggregated visitor data.
grant execute on function public.get_anonymous_visitors(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

-- Pick up the new columns/function immediately.
notify pgrst, 'reload schema';
