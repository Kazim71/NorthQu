-- =====================================================================
-- leadpulse — Phase 11: message status is COMPUTED, not stored
--
-- Until now `contacts.message_status` was a hardcoded text column
-- (set once by the seed, defaulted to 'none' on insert, never derived).
-- Phase 11 wants it computed on read from real data, so a contact's status
-- can never go stale relative to its activity.
--
-- The rule (see docs/CHANGELOG.md for the assumptions behind the windows):
--   cooldown : messaged within the last 48 hours
--   messaged : messaged more than 48 hours ago
--   ready    : never messaged, and has at least one event in the last 7 days
--   none     : never messaged, and no event in the last 7 days (incl. no events)
--
-- DESTRUCTIVE: this DROPS the stored `message_status` column. Any values
-- currently in it are discarded and replaced by the computed result. That is
-- the point — the stored column was the thing going stale. The only real
-- INPUT this needs is a "when did we message them" timestamp, added below as
-- `messaged_at` (a fact, not a status), which the computed status is derived
-- from. (There is no UI writing `messaged_at` yet — a "mark as messaged"
-- action is tracked in docs/TODO.md; the seed sets it for demonstration.)
--
-- Apply AFTER 0005, in the Supabase SQL editor.
-- =====================================================================

-- 1. The one new input: when we last messaged this contact. NULL = never.
alter table public.contacts
  add column if not exists messaged_at timestamptz;

-- Supports the recency check inside the computed status (and any future
-- per-contact activity lookups).
create index if not exists events_contact_created_idx
  on public.events (contact_id, created_at desc);

-- 2. Drop the stored status column (and with it its CHECK + default). Must
--    happen before the function below is created, so the function's name
--    doesn't collide with the column on the PostgREST contacts resource.
alter table public.contacts
  drop column if exists message_status;

-- 3. The computed status. A function taking the contacts row type is exposed
--    by PostgREST as a virtual `message_status` column, so existing queries
--    that `select ... message_status` or filter `.eq('message_status','ready')`
--    keep working unchanged — but now every read computes the live value.
--
--    STABLE (not IMMUTABLE): it reads now() and the events table. SECURITY
--    INVOKER (default) so the EXISTS on events is filtered by the caller's
--    own RLS — an org admin's status only ever considers their own events.
create or replace function public.message_status(c public.contacts)
returns text
language sql
stable
as $$
  select case
    when c.messaged_at is not null and c.messaged_at >= now() - interval '48 hours'
      then 'cooldown'
    when c.messaged_at is not null
      then 'messaged'
    when exists (
      select 1
      from public.events e
      where e.contact_id = c.id
        and e.created_at >= now() - interval '7 days'
    )
      then 'ready'
    else 'none'
  end
$$;

-- Callable by the dashboard (authenticated) and the backend (service_role).
-- Table-level RLS still governs which rows/events each role can see.
grant execute on function public.message_status(public.contacts)
  to authenticated, service_role, anon;

-- Tell PostgREST to pick up the new computed column immediately.
notify pgrst, 'reload schema';
