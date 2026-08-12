import type { SupabaseClient } from '@supabase/supabase-js';
import { previousRange, rangeLengthDays, toDateParam, type DateRange } from './dateRange';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  created_at: string;
}

/** Platform-admin-only fields — see migration 0010. Kept off the base
 * Organization type since ordinary dashboard queries never need them. */
export interface OrganizationAdminFields {
  ingestion_paused: boolean;
  has_leadpulse: boolean;
  has_automation: boolean;
  has_web_services: boolean;
  has_crm: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  generated_by_ai: boolean;
  created_at: string;
  published_at: string | null;
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  is_active: boolean;
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

/**
 * One row of the UNIFIED dashboard: a visitor, identified or not. Contact
 * fields are null for anyone who hasn't identified themselves yet — the UI
 * renders those as "—" rather than pretending the data exists.
 */
export interface Visitor {
  visitorId: string;
  contactId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  pageCount: number;
  ipAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  deviceBrowser: string | null;
  deviceOs: string | null;
  deviceType: string | null;
  recentEvents: AnonymousVisitorEvent[];
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

/** Migration-0010 columns' defaults — matches the migration's own SQL
 * defaults exactly (has_leadpulse true, everything else false/unpaused),
 * so a pre-migration read and a post-migration read of a fresh row agree. */
const ORG_ADMIN_FIELDS_DEFAULT: OrganizationAdminFields = {
  ingestion_paused: false,
  has_leadpulse: true,
  has_automation: false,
  has_web_services: false,
  has_crm: false,
};

/**
 * Platform-admin-only fields (ingestion_paused, has_*). A SEPARATE query
 * from getOrganization() rather than adding these columns there: they're
 * only ever read on the super-admin org page, and keeping them off the
 * shared Organization type stops them silently leaking into an org-admin's
 * own dashboard queries later just because the type made them available.
 *
 * Falls back to ORG_ADMIN_FIELDS_DEFAULT (not null, not a throw) if
 * migration 0010 hasn't been applied yet — same isMissingFunctionError()
 * pattern getOrgAnalytics() uses for migration 0009. This one matters more
 * than most: /app (the service hub) calls this on EVERY org-admin login,
 * so a missing migration must never break signing in.
 */
export async function getOrganizationAdminFields(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationAdminFields> {
  const { data, error } = await supabase
    .from('organizations')
    .select('ingestion_paused, has_leadpulse, has_automation, has_web_services, has_crm')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) {
    if (isMissingFunctionError(error)) return ORG_ADMIN_FIELDS_DEFAULT;
    throw new Error(`Failed to load organization admin fields: ${error.message}`);
  }
  return (data as OrganizationAdminFields) ?? ORG_ADMIN_FIELDS_DEFAULT;
}

/**
 * The org's own api_key — a self-read, not platform-admin-only (RLS's
 * organizations_select_own already permits an org's own admin to read
 * their own row, api_key included; this is a separate function from
 * getOrganization() purely so the base Organization type doesn't carry a
 * secret-shaped field by default).
 */
export async function getOrganizationApiKey(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('api_key')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load API key: ${error.message}`);
  return (data?.api_key as string) ?? null;
}

/**
 * Admins/agents for one org. Read via the anon client — the platform
 * admin's cross-org SELECT policy (migration 0003) already covers this;
 * only writes need the service-role escape hatch (see /api/admin/users).
 *
 * Falls back to a query without `name`/`is_active` (migration 0010) if
 * that migration hasn't been applied yet, defaulting name to null and
 * is_active to true (matching the migration's own column default) —
 * same reasoning as getOrganizationAdminFields(): the Team/Admins
 * management UI should degrade to "no names set yet, everyone active"
 * rather than break entirely.
 */
export async function getAdminUsers(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, name, email, role, is_active, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    if (!isMissingFunctionError(error)) {
      throw new Error(`Failed to load admin users: ${error.message}`);
    }
    const fallback = await supabase
      .from('admin_users')
      .select('id, email, role, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });
    if (fallback.error) {
      throw new Error(`Failed to load admin users: ${fallback.error.message}`);
    }
    return ((fallback.data ?? []) as Omit<AdminUserRow, 'name' | 'is_active'>[]).map((row) => ({
      ...row,
      name: null,
      is_active: true,
    }));
  }
  return (data ?? []) as AdminUserRow[];
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

// =====================================================================
// Unified visitors — Phase 7. Supersedes the split getLeads() /
// getAnonymousVisitors() pair for the dashboard's single table. Backed by
// get_visitors() (migration 0008), which range-filters events BEFORE
// aggregating so the counts describe the selected window honestly.
// =====================================================================

interface VisitorRpcRow {
  visitor_id: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  first_seen: string;
  last_seen: string;
  event_count: number;
  page_count: number;
  ip_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  device_browser: string | null;
  device_os: string | null;
  device_type: string | null;
}

export async function getVisitors(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
  options: { identifiedOnly?: boolean } = {},
): Promise<Visitor[]> {
  const { data, error } = await supabase.rpc('get_visitors', {
    p_organization_id: organizationId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });

  if (error) throw new Error(`Failed to load visitors: ${error.message}`);

  const allRows = (data ?? []) as VisitorRpcRow[];

  /**
   * `identifiedOnly` drops anonymous visitors HERE, on the server, before
   * anything else happens — not with a `.filter()` in the component.
   *
   * That ordering is the whole point, and it buys three things at once:
   *  - Privacy: an anonymous visitor's IP address, city and device string
   *    never leave the server for an org-admin session at all. Filtering
   *    client-side would still ship every one of those rows to the browser
   *    and merely hide them, which is not the same promise.
   *  - Payload: the batched event fetch below runs against the surviving
   *    visitor ids only, so a storefront with 95% anonymous traffic stops
   *    sending ~20x the event rows the page can actually display.
   *  - Honesty of counts: every "N visitors" figure the caller derives
   *    from this array then describes exactly what is on screen.
   *
   * The super-admin org view deliberately does NOT pass this — a platform
   * operator inspecting a tenant still sees the full picture.
   */
  const rows = options.identifiedOnly
    ? allRows.filter((r) => r.contact_id !== null)
    : allRows;

  if (rows.length === 0) return [];

  // One batched query for every visitor's activity trail, grouped in
  // memory — same pattern as getLeads(), not one query per row.
  const visitorIds = rows.map((r) => r.visitor_id);
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, visitor_id, event_type, url, created_at, metadata')
    .eq('organization_id', organizationId)
    .in('visitor_id', visitorIds)
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())
    .order('created_at', { ascending: false })
    .limit(2000);

  if (eventsError) throw new Error(`Failed to load visitor events: ${eventsError.message}`);

  const byVisitor = new Map<string, AnonymousVisitorEvent[]>();
  for (const e of (events ?? []) as (AnonymousVisitorEvent & { visitor_id: string })[]) {
    const list = byVisitor.get(e.visitor_id) ?? [];
    list.push({ id: e.id, event_type: e.event_type, url: e.url, created_at: e.created_at, metadata: e.metadata });
    byVisitor.set(e.visitor_id, list);
  }

  return rows.map((r) => ({
    visitorId: r.visitor_id,
    contactId: r.contact_id,
    name: r.contact_name,
    phone: r.contact_phone,
    email: r.contact_email,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    // Counts come from the RPC (true totals over the range), not from the
    // capped detail fetch above — recentEvents is only for the trail.
    eventCount: r.event_count,
    pageCount: r.page_count,
    ipAddress: r.ip_address,
    city: r.city,
    state: r.state,
    country: r.country,
    deviceBrowser: r.device_browser,
    deviceOs: r.device_os,
    deviceType: r.device_type,
    recentEvents: (byVisitor.get(r.visitor_id) ?? []).slice(0, 25),
  }));
}

// =====================================================================
// Analytics (migration 0009). Every function here is a thin wrapper over
// one Postgres RPC: the aggregation must happen in the database because
// each one filters by date range BEFORE grouping, and doing that in memory
// would mean shipping every event row in the range to the browser just to
// count them. The RPCs are SECURITY INVOKER, so the caller's own RLS still
// applies — the explicit organizationId argument is what pins a platform
// admin to one tenant (see the note above getOrganizations).
// =====================================================================

export interface FunnelStage {
  stage: string;
  stageOrder: number;
  visitorCount: number;
  /**
   * Share of the FIRST stage, 0-100. Computed here rather than in SQL so the
   * component never has to know which stage is the baseline.
   */
  pctOfTop: number;
  /**
   * Share of the PREVIOUS stage, 0-100, or null for the first stage where
   * "drop-off from the step before" has no meaning. Null rather than 100 so
   * the UI can omit it instead of rendering a misleading perfect score.
   */
  pctOfPrevious: number | null;
}

export interface TopProduct {
  name: string;
  productId: string | null;
  viewCount: number;
  cartCount: number;
  purchaseCount: number;
}

export interface TopSearch {
  term: string;
  searchCount: number;
  visitorCount: number;
}

export interface TopCategory {
  category: string;
  viewCount: number;
  visitorCount: number;
}

export interface TrafficSource {
  source: string;
  medium: string;
  visitorCount: number;
  eventCount: number;
}

export interface VisitorTypeSplit {
  newVisitors: number;
  returningVisitors: number;
}

/** Shared RPC arg shape — every analytics function takes the same range. */
function rangeArgs(organizationId: string, range: DateRange) {
  return {
    p_organization_id: organizationId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  };
}

export async function getConversionFunnel(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
): Promise<FunnelStage[]> {
  const { data, error } = await supabase.rpc('get_conversion_funnel', rangeArgs(organizationId, range));
  if (error) throw new Error(`Failed to load conversion funnel: ${error.message}`);

  const rows = ((data ?? []) as { stage: string; stage_order: number; visitor_count: number }[])
    .slice()
    .sort((a, b) => a.stage_order - b.stage_order);

  const top = rows[0]?.visitor_count ?? 0;

  return rows.map((r, i) => {
    const previous = i === 0 ? null : rows[i - 1]?.visitor_count ?? 0;
    return {
      stage: r.stage,
      stageOrder: r.stage_order,
      visitorCount: Number(r.visitor_count),
      pctOfTop: top === 0 ? 0 : Math.round((Number(r.visitor_count) / top) * 100),
      // Guard the zero denominator explicitly: a stage nobody reached makes
      // the next stage's conversion undefined, not 0% and certainly not ∞.
      pctOfPrevious:
        previous === null || previous === 0
          ? null
          : Math.round((Number(r.visitor_count) / Number(previous)) * 100),
    };
  });
}

export async function getTopProducts(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
  limit = 8,
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc('get_top_products', {
    ...rangeArgs(organizationId, range),
    p_limit: limit,
  });
  if (error) throw new Error(`Failed to load top products: ${error.message}`);

  return ((data ?? []) as {
    product_name: string;
    product_id: string | null;
    view_count: number;
    cart_count: number;
    purchase_count: number;
  }[]).map((r) => ({
    name: r.product_name,
    productId: r.product_id,
    viewCount: Number(r.view_count),
    cartCount: Number(r.cart_count),
    purchaseCount: Number(r.purchase_count),
  }));
}

export async function getTopSearches(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
  limit = 8,
): Promise<TopSearch[]> {
  const { data, error } = await supabase.rpc('get_top_searches', {
    ...rangeArgs(organizationId, range),
    p_limit: limit,
  });
  if (error) throw new Error(`Failed to load top searches: ${error.message}`);

  return ((data ?? []) as { term: string; search_count: number; visitor_count: number }[]).map(
    (r) => ({
      term: r.term,
      searchCount: Number(r.search_count),
      visitorCount: Number(r.visitor_count),
    }),
  );
}

export async function getTopCategories(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
  limit = 8,
): Promise<TopCategory[]> {
  const { data, error } = await supabase.rpc('get_top_categories', {
    ...rangeArgs(organizationId, range),
    p_limit: limit,
  });
  if (error) throw new Error(`Failed to load top categories: ${error.message}`);

  return ((data ?? []) as { category: string; view_count: number; visitor_count: number }[]).map(
    (r) => ({
      category: r.category,
      viewCount: Number(r.view_count),
      visitorCount: Number(r.visitor_count),
    }),
  );
}

export async function getTrafficSources(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
  limit = 8,
): Promise<TrafficSource[]> {
  const { data, error } = await supabase.rpc('get_traffic_sources', {
    ...rangeArgs(organizationId, range),
    p_limit: limit,
  });
  if (error) throw new Error(`Failed to load traffic sources: ${error.message}`);

  return ((data ?? []) as {
    source: string;
    medium: string;
    visitor_count: number;
    event_count: number;
  }[]).map((r) => ({
    source: r.source,
    medium: r.medium,
    visitorCount: Number(r.visitor_count),
    eventCount: Number(r.event_count),
  }));
}

export async function getVisitorTypes(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
): Promise<VisitorTypeSplit> {
  const { data, error } = await supabase.rpc('get_visitor_types', rangeArgs(organizationId, range));
  if (error) throw new Error(`Failed to load visitor types: ${error.message}`);

  const rows = (data ?? []) as { visitor_type: string; visitor_count: number }[];
  const find = (t: string) => Number(rows.find((r) => r.visitor_type === t)?.visitor_count ?? 0);

  return { newVisitors: find('new'), returningVisitors: find('returning') };
}

export interface OrgAnalytics {
  funnel: FunnelStage[];
  topProducts: TopProduct[];
  topSearches: TopSearch[];
  topCategories: TopCategory[];
  trafficSources: TrafficSource[];
  visitorTypes: VisitorTypeSplit;
}

/**
 * PostgREST's error when an RPC doesn't exist in its schema cache.
 *
 * Matched so the ONE recoverable cause — migration 0009 not applied yet —
 * can be told apart from every other failure. Frontend deploys and SQL
 * migrations are independent steps in this project (migrations are applied
 * by hand in the Supabase editor), so there is a real window where the code
 * is live and the functions are not.
 */
function isMissingFunctionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /Could not find the function|schema cache/i.test(message);
}

/**
 * Every analytics RPC for one org, in parallel.
 *
 * Bundled so the two pages that render this panel (org Summary and the
 * super-admin org detail) can't drift into fetching different subsets, and
 * so the six round-trips overlap instead of serializing — the page is
 * blocked on the slowest one, not their sum.
 *
 * Returns null when migration 0009 hasn't been applied, so the rest of the
 * Summary page still renders. This is NOT a blanket try/catch: any other
 * error still throws. Swallowing everything here would turn a broken query
 * into a permanently empty panel that looks like "no data yet" — the single
 * most misleading failure mode a dashboard can have.
 */
export async function getOrgAnalytics(
  supabase: SupabaseClient,
  organizationId: string,
  range: DateRange,
): Promise<OrgAnalytics | null> {
  try {
    const [funnel, topProducts, topSearches, topCategories, trafficSources, visitorTypes] =
      await Promise.all([
        getConversionFunnel(supabase, organizationId, range),
        getTopProducts(supabase, organizationId, range),
        getTopSearches(supabase, organizationId, range),
        getTopCategories(supabase, organizationId, range),
        getTrafficSources(supabase, organizationId, range),
        getVisitorTypes(supabase, organizationId, range),
      ]);

    return { funnel, topProducts, topSearches, topCategories, trafficSources, visitorTypes };
  } catch (err) {
    if (isMissingFunctionError(err)) return null;
    throw err;
  }
}

/**
 * All blog posts (draft + published), for the platform-admin content
 * review page. Read via the anon client — blog_posts_select_all_platform_admin
 * (migration 0011) already grants a platform admin full read; only writes
 * need the service-role route (/api/admin/content/*).
 */
export async function getBlogPosts(supabase: SupabaseClient): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, status, generated_by_ai, created_at, published_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load blog posts: ${error.message}`);
  return (data ?? []) as BlogPost[];
}

/** Published posts only, newest first — powers the public /insights page.
 * blog_posts_select_published (migration 0011) grants this to `anon`. */
export async function getPublishedBlogPosts(supabase: SupabaseClient): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, status, generated_by_ai, created_at, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw new Error(`Failed to load blog posts: ${error.message}`);
  return (data ?? []) as BlogPost[];
}

export async function getBlogPostBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, status, generated_by_ai, created_at, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw new Error(`Failed to load blog post: ${error.message}`);
  return (data as BlogPost) ?? null;
}
