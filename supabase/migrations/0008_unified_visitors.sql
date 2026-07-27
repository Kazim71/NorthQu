-- =====================================================================
-- leadpulse — Phase 7: one unified visitor view
--
-- Replaces the split "Leads" (contacts) / "Anonymous Visitors" (unlinked
-- events) dashboard with a single list keyed on visitor_id, where an
-- identified visitor simply has contact columns filled in and an
-- anonymous one has them NULL (rendered as "—" in the UI).
--
--   1. events.ip_address — the raw client IP. Until now only the DERIVED
--      location (city/state/country/pincode, added in 0007's enrichment)
--      was stored, never the address itself.
--   2. get_visitors() — one row per visitor_id across the WHOLE org,
--      identified or not, LEFT JOINed to its contact.
--
-- PRIVACY NOTE: a raw IP is personal data under GDPR/DPDP in a way that a
-- coarse "Bengaluru, IN" is not. It is stored here because the dashboard
-- explicitly needs to display it, but it inherits the same per-tenant RLS
-- as every other events column, and it is worth a retention policy (drop
-- ip_address after N days) before this serves EU traffic at volume.
-- Tracked in docs/TODO.md.
--
-- Apply AFTER 0007, in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Raw client IP on events
-- ---------------------------------------------------------------------
-- `text`, deliberately NOT the `inet` type. inet would give free
-- validation, but an unparseable value would then throw on INSERT and
-- fail the whole event ingestion — trading a cosmetic data issue for lost
-- analytics data. getClientIp() already normalizes/validates upstream
-- (backend/src/lib/clientIp.ts), so text keeps ingestion fail-safe.
alter table public.events
  add column if not exists ip_address text;

-- ---------------------------------------------------------------------
-- 2. get_visitors() — the unified list
-- ---------------------------------------------------------------------
-- Supersedes get_anonymous_visitors() (0007), which is left in place so
-- nothing referencing it breaks mid-deploy; it can be dropped once the
-- dashboard no longer calls it.
--
-- Same design decisions as that function, for the same reasons:
--   * A FUNCTION, not a view, so the date range filters events BEFORE
--     aggregation — that is what makes event_count/page_count honest for
--     the selected window rather than an all-time count clipped after.
--   * SECURITY INVOKER (the default): the body reads public.events and
--     public.contacts, so the CALLER's RLS applies and an org admin can
--     only ever see their own tenant.
--   * Every reference alias-qualified, because the RETURNS TABLE output
--     names collide with the source column names.
--
-- Contact linkage resolves from TWO sources, coalesced: the latest
-- non-null events.contact_id (backfilled onto every prior event by
-- identify_visitor()) and visitor_identity_map (the canonical
-- visitor -> contact record). Either alone is normally sufficient; using
-- both means a visitor still resolves if one write path ever lags.
create or replace function public.get_visitors(
  p_organization_id uuid,
  p_from            timestamptz default null,
  p_to              timestamptz default null
)
returns table (
  visitor_id     text,
  contact_id     uuid,
  contact_name   text,
  contact_phone  text,
  contact_email  text,
  first_seen     timestamptz,
  last_seen      timestamptz,
  event_count    bigint,
  page_count     bigint,
  ip_address     text,
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
  with agg as (
    select
      e.visitor_id                                   as v_visitor_id,
      min(e.created_at)                              as v_first_seen,
      max(e.created_at)                              as v_last_seen,
      count(*)::bigint                               as v_event_count,
      count(distinct e.url)::bigint                  as v_page_count,
      -- Latest NON-NULL wins for each field: a visitor's early events may
      -- predate enrichment (or one lookup may have failed) while later
      -- ones succeeded. Never invents a value — all-null in, null out.
      (array_agg(e.contact_id     order by e.created_at desc) filter (where e.contact_id     is not null))[1] as v_contact_id,
      (array_agg(e.ip_address     order by e.created_at desc) filter (where e.ip_address     is not null))[1] as v_ip_address,
      (array_agg(e.city           order by e.created_at desc) filter (where e.city           is not null))[1] as v_city,
      (array_agg(e.state          order by e.created_at desc) filter (where e.state          is not null))[1] as v_state,
      (array_agg(e.country        order by e.created_at desc) filter (where e.country        is not null))[1] as v_country,
      (array_agg(e.device_browser order by e.created_at desc) filter (where e.device_browser is not null))[1] as v_device_browser,
      (array_agg(e.device_os      order by e.created_at desc) filter (where e.device_os      is not null))[1] as v_device_os,
      (array_agg(e.device_type    order by e.created_at desc) filter (where e.device_type    is not null))[1] as v_device_type
    from public.events e
    where e.organization_id = p_organization_id
      and (p_from is null or e.created_at >= p_from)
      and (p_to   is null or e.created_at <= p_to)
    group by e.visitor_id
  )
  select
    a.v_visitor_id,
    coalesce(a.v_contact_id, vim.contact_id),
    c.name,
    c.phone,
    c.email,
    a.v_first_seen,
    a.v_last_seen,
    a.v_event_count,
    a.v_page_count,
    a.v_ip_address,
    a.v_city,
    a.v_state,
    a.v_country,
    a.v_device_browser,
    a.v_device_os,
    a.v_device_type
  from agg a
  left join public.visitor_identity_map vim
    on vim.visitor_id = a.v_visitor_id
   and vim.organization_id = p_organization_id
  left join public.contacts c
    on c.id = coalesce(a.v_contact_id, vim.contact_id)
  order by a.v_last_seen desc
$$;

-- Dashboard calls this as the logged-in user; service_role for
-- backend/verification. `anon` deliberately NOT granted — the tracking
-- snippet has no business reading aggregated visitor data.
grant execute on function public.get_visitors(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

notify pgrst, 'reload schema';
