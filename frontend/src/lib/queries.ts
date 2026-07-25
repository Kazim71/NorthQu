import type { SupabaseClient } from '@supabase/supabase-js';
import { previousRange, rangeLengthDays, toDateParam, type DateRange } from './dateRange';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  created_at: string;
}

export interface LeadEvent {
  id: string;
  event_type: string;
  url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  message_status: string;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
  eventCount: number;
  recentEvents: LeadEvent[];
}

export interface DailyCount {
  /** ISO date, `YYYY-MM-DD`, no time component. */
  date: string;
  count: number;
}

export interface TrendStat {
  current: number;
  previous: number;
  /** null when `previous` is 0 — a percentage change from zero is undefined, not "∞%" or "0%". */
  pctChange: number | null;
}

export interface ReadySignalLead {
  id: string;
  name: string | null;
  city: string | null;
  last_seen: string | null;
  /** Only populated by the platform-wide variant, for the super-admin dropdown. */
  organizationName?: string;
}

export interface OrgSummary {
  contactCount: number;
  eventCount: number;
  anonymousEventCount: number;
  identifiedEventCount: number;
  eventsByType: { type: string; count: number }[];
  topCities: { city: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  /** Share of the selected range's events per device_type. Empty until Phase 6 enrichment has data. */
  deviceBreakdown: { type: string; count: number }[];
}

export interface AnonymousVisitorEvent {
  id: string;
  event_type: string;
  url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AnonymousVisitor {
  visitorId: string;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  city: string | null;
  state: string | null;
  country: string | null;
  deviceBrowser: string | null;
  deviceOs: string | null;
  deviceType: string | null;
  recentEvents: AnonymousVisitorEvent[];
}

/**
 * EVERY query in this file filters organization_id explicitly.
 *
 * That is not redundant with RLS. After migration 0003, a platform admin's
 * SELECT policy permits cross-tenant reads, so an unfiltered query would
 * return every tenant's rows blended together. RLS stops an ORG admin from
 * over-reaching; only the explicit filter keeps a PLATFORM admin's view
 * pinned to the org they actually opened.
 */

export async function getOrganizations(
  supabase: SupabaseClient,
): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, industry, created_at')
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to load organizations: ${error.message}`);
  return (data ?? []) as Organization[];
}

export async function getOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, industry, created_at')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load organization: ${error.message}`);
  return (data as Organization) ?? null;
}

/** Contact counts per org, for the super-admin company grid. */
export async function getContactCountsByOrg(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  // One query returning only the org id column, tallied in memory. At seed
  // scale this is trivially cheap; the alternative — a count query per card —
  // is a genuine N+1 that grows with tenant count.
  const { data, error } = await supabase.from('contacts').select('organization_id');

  if (error) throw new Error(`Failed to count contacts: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { organization_id: string }[]) {
    counts[row.organization_id] = (counts[row.organization_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * `range`, if given, scopes each lead's `eventCount`/`recentEvents` to that
 * window — it does NOT change which contacts are returned. A lead with zero
 * events in the selected range still appears (with eventCount: 0), rather
 * than disappearing from the list: the leads table is a CRM view of every
 * known contact, not an activity feed, and contacts should never seem to
 * vanish because of which date range happens to be selected.
 */
export async function getLeads(
  supabase: SupabaseClient,
  organizationId: string,
  range?: DateRange,
): Promise<Lead[]> {
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select(
      'id, name, phone, email, city, state, country, message_status, first_seen, last_seen, created_at',
    )
    .eq('organization_id', organizationId)
    .order('last_seen', { ascending: false, nullsFirst: false });

  if (contactsError) throw new Error(`Failed to load leads: ${contactsError.message}`);
  if (!contacts || contacts.length === 0) return [];

  const contactIds = contacts.map((c) => c.id as string);

  // Two queries total, not one per lead. Events are fetched in a single
  // batched `in` and grouped in memory.
  let eventsQuery = supabase
    .from('events')
    .select('id, contact_id, event_type, url, created_at, metadata')
    .eq('organization_id', organizationId)
    .in('contact_id', contactIds)
    .order('created_at', { ascending: false })
    .limit(500);

  if (range) {
    eventsQuery = eventsQuery.gte('created_at', range.from.toISOString()).lte('created_at', range.to.toISOString());
  }

  const { data: events, error: eventsError } = await eventsQuery;

  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`);

  const byContact = new Map<string, LeadEvent[]>();
  for (const e of (events ?? []) as (LeadEvent & { contact_id: string })[]) {
    const list = byContact.get(e.contact_id) ?? [];
    list.push({
      id: e.id,
      event_type: e.event_type,
      url: e.url,
      created_at: e.created_at,
      metadata: e.metadata,
    });
    byContact.set(e.contact_id, list);
  }

  return contacts.map((c) => {
    const contactEvents = byContact.get(c.id as string) ?? [];
    return {
      ...(c as unknown as Omit<Lead, 'eventCount' | 'recentEvents'>),
      eventCount: contactEvents.length,
      recentEvents: contactEvents.slice(0, 8),
    };
  });
}

/**
 * `range`, if given, scopes every ACTIVITY metric (eventCount, eventsByType,
 * topCities, deviceBreakdown, anonymous/identifiedEventCount) to that
 * window. `contactCount` and `statusBreakdown` deliberately stay all-time —
 * they describe the org's current customer base and current lead pipeline
 * state, not "what happened in the last N days", so windowing them would
 * make a low-traffic day look like contacts had disappeared.
 */
export async function getOrgSummary(
  supabase: SupabaseClient,
  organizationId: string,
  range?: DateRange,
): Promise<OrgSummary> {
  let eventsQuery = supabase
    .from('events')
    .select('event_type, contact_id, city, device_type')
    .eq('organization_id', organizationId);

  if (range) {
    eventsQuery = eventsQuery.gte('created_at', range.from.toISOString()).lte('created_at', range.to.toISOString());
  }

  const [{ count: contactCount }, { data: events }, { data: contacts }] =
    await Promise.all([
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      eventsQuery,
      supabase
        .from('contacts')
        .select('message_status')
        .eq('organization_id', organizationId),
    ]);

  const eventRows = (events ?? []) as {
    event_type: string;
    contact_id: string | null;
    city: string | null;
    device_type: string | null;
  }[];

  const typeCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  let anonymous = 0;

  for (const e of eventRows) {
    typeCounts.set(e.event_type, (typeCounts.get(e.event_type) ?? 0) + 1);
    if (e.contact_id === null) anonymous++;
    if (e.city) cityCounts.set(e.city, (cityCounts.get(e.city) ?? 0) + 1);
    if (e.device_type) deviceCounts.set(e.device_type, (deviceCounts.get(e.device_type) ?? 0) + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const c of (contacts ?? []) as { message_status: string }[]) {
    statusCounts.set(c.message_status, (statusCounts.get(c.message_status) ?? 0) + 1);
  }

  const sortDesc = <T extends { count: number }>(arr: T[]) =>
    arr.sort((a, b) => b.count - a.count);

  return {
    contactCount: contactCount ?? 0,
    eventCount: eventRows.length,
    anonymousEventCount: anonymous,
    identifiedEventCount: eventRows.length - anonymous,
    eventsByType: sortDesc(
      [...typeCounts.entries()].map(([type, count]) => ({ type, count })),
    ),
    topCities: sortDesc(
      [...cityCounts.entries()].map(([city, count]) => ({ city, count })),
    ).slice(0, 5),
    statusBreakdown: sortDesc(
      [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    ),
    deviceBreakdown: sortDesc(
      [...deviceCounts.entries()].map(([type, count]) => ({ type, count })),
    ),
  };
}

// =====================================================================
// Added for the dashboard feature-expansion task: charts, trend badges,
// and the notification bell. Bucketing happens in memory rather than via
// a Postgres date_trunc RPC, matching the pattern getOrgSummary already
// established — small enough at current data volume, and it keeps every
// query here a plain PostgREST select rather than introducing a second
// query mechanism.
// =====================================================================

function bucketByDay(timestamps: string[], range: DateRange): DailyCount[] {
  const buckets = new Map<string, number>();

  // Seed every day in the window with 0 so the chart has no gaps — a day
  // with no events must render as a zero point, not a missing one.
  const days = rangeLengthDays(range);
  for (let i = 0; i < days; i++) {
    const d = new Date(range.from);
    d.setDate(d.getDate() + i);
    buckets.set(toDateParam(d), 0);
  }

  for (const ts of timestamps) {
    // ts is a UTC ISO timestamp; bucket by its LOCAL calendar day so it
    // lines up with the from/to range, which is itself local-day based
    // (see dateRange.ts's toDateParam).
    const day = toDateParam(new Date(ts));
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/** Events per day for ONE org, for the org-detail and org-admin charts. */
export async function getEventsOverTime(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
): Promise<DailyCount[]> {
  const { data, error } = await supabase
    .from('events')
    .select('created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString());

  if (error) throw new Error(`Failed to load event history: ${error.message}`);

  return bucketByDay((data ?? []).map((r) => (r as { created_at: string }).created_at), range);
}

/**
 * Events per day across EVERY org — the one deliberate exception to "every
 * query filters organization_id". This is the super-admin's own aggregate
 * view, not a per-org query masquerading as one; callers MUST be gated by
 * requirePlatformAdmin() before this runs, same as every other cross-org
 * read in this file.
 */
export async function getPlatformEventsOverTime(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<DailyCount[]> {
  const { data, error } = await supabase
    .from('events')
    .select('created_at')
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString());

  if (error) throw new Error(`Failed to load platform event history: ${error.message}`);

  return bucketByDay((data ?? []).map((r) => (r as { created_at: string }).created_at), range);
}

/**
 * Event-count trend: the selected range vs. the equal-length window
 * immediately before it (see dateRange.ts's previousRange). Computed from
 * two real `created_at` ranges — never fabricated. `previous === 0` yields
 * `pctChange: null` rather than a nonsensical infinite percentage.
 */
export async function getEventCountTrend(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
): Promise<TrendStat> {
  const prior = previousRange(range);

  const [{ count: current }, { count: previous }] = await Promise.all([
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', range.from.toISOString())
      .lte('created_at', range.to.toISOString()),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', prior.from.toISOString())
      .lte('created_at', prior.to.toISOString()),
  ]);

  const cur = current ?? 0;
  const prev = previous ?? 0;

  return { current: cur, previous: prev, pctChange: prev === 0 ? null : ((cur - prev) / prev) * 100 };
}

/**
 * "Ready to contact" signal for the notification bell.
 *
 * `message_status` is now COMPUTED on read (migration 0006): a Postgres
 * function exposed by PostgREST as a virtual column, so filtering
 * `.eq('message_status', 'ready')` genuinely derives the status rather than
 * reading a stale stored value. 'ready' = never messaged AND has at least
 * one event in the last 7 days.
 *
 * This signal further narrows to ready leads whose last identify (`last_seen`,
 * which advances on identify, not on every event) was within 24h — i.e.
 * "ready leads who showed up recently." It's still not literally "became
 * ready in the last 24h" (there's no status-change timestamp), and that
 * distinction is surfaced in the UI copy, not just this comment.
 */
export async function getReadySignal(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ReadySignalLead[]> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, city, last_seen')
    .eq('organization_id', organizationId)
    .eq('message_status', 'ready')
    .gte('last_seen', since.toISOString())
    .order('last_seen', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to load ready-lead signal: ${error.message}`);
  return (data ?? []) as ReadySignalLead[];
}

/** Platform-wide variant of getReadySignal(), joined with org name for display. */
export async function getPlatformReadySignal(
  supabase: SupabaseClient,
): Promise<ReadySignalLead[]> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, city, last_seen, organization_id, organizations(name)')
    .eq('message_status', 'ready')
    .gte('last_seen', since.toISOString())
    .order('last_seen', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to load platform ready-lead signal: ${error.message}`);

  return ((data ?? []) as unknown as Array<{
    id: string;
    name: string | null;
    city: string | null;
    last_seen: string | null;
    organizations: { name: string } | null;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    last_seen: row.last_seen,
    organizationName: row.organizations?.name,
  }));
}

// =====================================================================
// Anonymous visitors — Phase 6. Visitors with events but no linked contact,
// scoped to a date range. See migration 0007's get_anonymous_visitors()
// for why this is a Postgres function (range-filters BEFORE aggregating)
// rather than a plain view.
// =====================================================================

interface AnonymousVisitorRpcRow {
  visitor_id: string;
  first_seen: string;
  last_seen: string;
  event_count: number;
  city: string | null;
  state: string | null;
  country: string | null;
  device_browser: string | null;
  device_os: string | null;
  device_type: string | null;
}

export async function getAnonymousVisitors(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
): Promise<AnonymousVisitor[]> {
  const { data, error } = await supabase.rpc('get_anonymous_visitors', {
    p_organization_id: organizationId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });

  if (error) throw new Error(`Failed to load anonymous visitors: ${error.message}`);

  const rows = (data ?? []) as AnonymousVisitorRpcRow[];
  if (rows.length === 0) return [];

  // Second query for the expandable activity trail, same batched-`in`
  // pattern as getLeads — one query for all visitors, grouped in memory,
  // not one query per row.
  const visitorIds = rows.map((r) => r.visitor_id);
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, visitor_id, event_type, url, created_at, metadata')
    .eq('organization_id', organizationId)
    .in('visitor_id', visitorIds)
    .is('contact_id', null)
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (eventsError) throw new Error(`Failed to load anonymous visitor events: ${eventsError.message}`);

  const byVisitor = new Map<string, AnonymousVisitorEvent[]>();
  for (const e of (events ?? []) as (AnonymousVisitorEvent & { visitor_id: string })[]) {
    const list = byVisitor.get(e.visitor_id) ?? [];
    list.push({ id: e.id, event_type: e.event_type, url: e.url, created_at: e.created_at, metadata: e.metadata });
    byVisitor.set(e.visitor_id, list);
  }

  return rows.map((r) => ({
    visitorId: r.visitor_id,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    // event_count comes from the RPC (a true count over the full range, not
    // capped by the 1000-row detail fetch above) — the source of truth for
    // the count column; recentEvents is only for the expandable trail.
    eventCount: r.event_count,
    city: r.city,
    state: r.state,
    country: r.country,
    deviceBrowser: r.device_browser,
    deviceOs: r.device_os,
    deviceType: r.device_type,
    recentEvents: (byVisitor.get(r.visitor_id) ?? []).slice(0, 8),
  }));
}
