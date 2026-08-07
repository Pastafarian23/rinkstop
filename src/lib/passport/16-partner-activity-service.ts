/**
 * src/lib/passport/16-partner-activity-service.ts
 *
 * Partner (business listing) passport activity service (WS7 PR2).
 *
 * Responsibilities:
 *   - Given a listing_id, find all venues linked to that listing
 *   - Aggregate passport activity (stamps + scan_events) at those venues
 *     and any events that parent to those venues
 *   - Surface the data as a single read model the operator dashboard uses
 *
 * Read-only. All writes to stamps/scan_events go through
 * 13-stamp-service.ts. The activity feed is the operator's window into
 * "is my venue driving passport engagement?"
 *
 * Per Workstream 1 Rule 6 (Zero Data Mutation): SELECT only.
 * Per Rule 9 (No Existing Foreign Keys Change): no FK changes here.
 *
 * Auth model: the page calls auth() from Clerk, then we verify
 *   listings.owner_user_id === clerkUserId
 * before touching any other table. The service-role client is used
 * after that gate, since RLS scoping would require installing
 * @supabase/ssr (a dep the rest of the codebase doesn't use). The
 * ownership check is the load-bearing gate.
 *
 * The listing → venue → stamps chain:
 *   listings.id → venues.listing_id (new in 2026-07-23 migration)
 *              → stamps.target_venue_id OR stamps.target_event_id (via venue_events)
 *
 * Caller pattern:
 *   const activity = await partnerActivityService.getForListing({
 *     listingId: '...',
 *     clerkUserId: userId,
 *     rangeDays: 30,
 *   });
 */

import { supabaseAdmin } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────

export interface PartnerActivityStamp {
  id: string;
  venueId: string | null;
  venueName: string | null;
  eventId: string | null;
  eventName: string | null;
  actorType: string;
  subjectType: string | null;
  context: string | null;
  source: string;
  status: string;
  stampedAt: string;
}

export interface PartnerActivityScan {
  id: string;
  qrIdentifier: string;
  outcome: string;
  actorUserId: string | null;
  createdAt: string;
}

export interface PartnerActivityVenueSummary {
  venueId: string;
  venueName: string;
  stampCount: number;
  scanCount: number;
  lastStampedAt: string | null;
}

export interface PartnerActivity {
  listingId: string;
  listingName: string;
  rangeDays: number;
  venueCount: number;
  totalStamps: number;
  totalScans: number;
  venues: PartnerActivityVenueSummary[];
  recentStamps: PartnerActivityStamp[];
  recentScans: PartnerActivityScan[];
  /** True when the caller does not own any venues on this listing. */
  empty: boolean;
}

export class PartnerActivityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartnerActivityNotFoundError';
  }
}

export class PartnerActivityForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartnerActivityForbiddenError';
  }
}

// ─── Service ────────────────────────────────────────────────

export class PartnerActivityService {
  /**
   * Fetch passport activity for a partner listing. Throws
   * PartnerActivityForbiddenError if the caller doesn't own the listing
   * (caller is responsible for turning that into a 404 so we don't leak
   * existence). Returns an empty activity object when the listing is
   * valid but no venues are linked yet.
   */
  async getForListing(opts: {
    listingId: string;
    clerkUserId: string;
    rangeDays?: number;
  }): Promise<PartnerActivity> {
    const rangeDays = opts.rangeDays ?? 30;
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    // ─── 1. Ownership check on the listing ──────────────────
    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('listings')
      .select('id, business_name, owner_user_id')
      .eq('id', opts.listingId)
      .maybeSingle();

    if (listingErr) {
      throw new PartnerActivityNotFoundError(`listings lookup failed: ${listingErr.message}`);
    }
    if (!listing) {
      throw new PartnerActivityNotFoundError('listing not found');
    }
    if (listing.owner_user_id !== opts.clerkUserId) {
      throw new PartnerActivityForbiddenError('caller does not own this listing');
    }

    // ─── 2. Venues linked to this listing ───────────────────
    const { data: venues, error: venuesErr } = await supabaseAdmin
      .from('venues')
      .select('id, name')
      .eq('listing_id', opts.listingId)
      .eq('status', 'active')
      .order('name');

    if (venuesErr) {
      throw new PartnerActivityNotFoundError(`venues lookup failed: ${venuesErr.message}`);
    }

    const venueIds = (venues ?? []).map((v) => v.id as string);

    if (venueIds.length === 0) {
      return {
        listingId: listing.id as string,
        listingName: listing.business_name as string,
        rangeDays,
        venueCount: 0,
        totalStamps: 0,
        totalScans: 0,
        venues: [],
        recentStamps: [],
        recentScans: [],
        empty: true,
      };
    }

    // ─── 3. Events that parent to these venues ──────────────
    const { data: events, error: eventsErr } = await supabaseAdmin
      .from('venue_events')
      .select('id, name, parent_venue_id')
      .in('parent_venue_id', venueIds);

    if (eventsErr) {
      throw new PartnerActivityNotFoundError(`events lookup failed: ${eventsErr.message}`);
    }
    const eventIds = (events ?? []).map((e) => e.id as string);
    const eventNameById = new Map<string, string>(
      (events ?? []).map((e) => [e.id as string, e.name as string]),
    );
    const venueNameById = new Map<string, string>(
      (venues ?? []).map((v) => [v.id as string, v.name as string]),
    );

    // ─── 4. Stamp activity (venue-targeted OR event-targeted) ─
    // Two parallel queries because PostgREST can't OR across separate
    // foreign-key columns. Limit 50 per side, then merge + cap at 50.
    const [venueStampsRes, eventStampsRes] = await Promise.all([
      supabaseAdmin
        .from('stamps')
        .select('id, target_venue_id, target_event_id, actor_type, subject_type, context, source, status, stamped_at')
        .in('target_venue_id', venueIds)
        .gte('stamped_at', since)
        .order('stamped_at', { ascending: false })
        .limit(50),
      eventIds.length > 0
        ? supabaseAdmin
            .from('stamps')
            .select('id, target_venue_id, target_event_id, actor_type, subject_type, context, source, status, stamped_at')
            .in('target_event_id', eventIds)
            .gte('stamped_at', since)
            .order('stamped_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null } as { data: Array<Record<string, unknown>>; error: null }),
    ]);

    if (venueStampsRes.error) {
      throw new PartnerActivityNotFoundError(`stamps (venue) failed: ${venueStampsRes.error.message}`);
    }
    if (eventStampsRes.error) {
      throw new PartnerActivityNotFoundError(`stamps (event) failed: ${eventStampsRes.error.message}`);
    }

    const allStamps = [
      ...((venueStampsRes.data ?? []) as Array<Record<string, unknown>>),
      ...((eventStampsRes.data ?? []) as Array<Record<string, unknown>>),
    ]
      .sort((a, b) => String(b.stamped_at).localeCompare(String(a.stamped_at)))
      .slice(0, 50);

    const recentStamps: PartnerActivityStamp[] = allStamps.map((s) => ({
      id: s.id as string,
      venueId: (s.target_venue_id as string | null) ?? null,
      venueName: s.target_venue_id ? venueNameById.get(s.target_venue_id as string) ?? null : null,
      eventId: (s.target_event_id as string | null) ?? null,
      eventName: s.target_event_id ? eventNameById.get(s.target_event_id as string) ?? null : null,
      actorType: s.actor_type as string,
      subjectType: (s.subject_type as string | null) ?? null,
      context: (s.context as string | null) ?? null,
      source: s.source as string,
      status: s.status as string,
      stampedAt: s.stamped_at as string,
    }));


    // ─── 5. Per-venue summary counts ────────────────────────

    // ─── 5. Recent scan_events ──────────────────────────────
    // scan_events.venue_id is populated by the stamp service at insert time.
    const { data: scanEventsData, error: scanEventsErr } = await supabaseAdmin
      .from('scan_events')
      .select('id, qr_identifier, outcome, actor_user_id, created_at, venue_id')
      .in('venue_id', venueIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    if (scanEventsErr) {
      throw new PartnerActivityNotFoundError(`scan_events lookup failed: ${scanEventsErr.message}`);
    }

    const scanEvents = (scanEventsData ?? []) as Array<Record<string, unknown>>;

    // Build per-venue scan counts.
    const scansByVenue = new Map<string, number>();
    for (const scan of scanEvents) {
      const vid = scan.venue_id as string | null;
      if (vid) scansByVenue.set(vid, (scansByVenue.get(vid) ?? 0) + 1);
    }

    const recentScans: PartnerActivityScan[] = scanEvents.map((s) => ({
      id: s.id as string,
      qrIdentifier: s.qr_identifier as string,
      outcome: s.outcome as string,
      actorUserId: (s.actor_user_id as string | null) ?? null,
      createdAt: s.created_at as string,
    }));

    // ─── 6. Per-venue summary counts ────────────────────────

    const stampsByVenue = new Map<string, number>();
    const lastStampedByVenue = new Map<string, string>();
    for (const s of allStamps) {
      const vid = s.target_venue_id as string | null;
      if (!vid) continue;
      stampsByVenue.set(vid, (stampsByVenue.get(vid) ?? 0) + 1);
      const ts = s.stamped_at as string;
      const prev = lastStampedByVenue.get(vid);
      if (!prev || ts > prev) lastStampedByVenue.set(vid, ts);
    }

    const venueSummaries: PartnerActivityVenueSummary[] = (venues ?? []).map((v) => ({
      venueId: v.id as string,
      venueName: v.name as string,
      stampCount: stampsByVenue.get(v.id as string) ?? 0,

      scanCount: scansByVenue.get(v.id as string) ?? 0,
      lastStampedAt: lastStampedByVenue.get(v.id as string) ?? null,
    }));

    return {
      listingId: listing.id as string,
      listingName: listing.business_name as string,
      rangeDays,
      venueCount: venueIds.length,
      totalStamps: allStamps.length,
      totalScans: recentScans.length,
      venues: venueSummaries,
      recentStamps,
      recentScans,
      empty: false,
    };
  }
}

export const partnerActivityService = new PartnerActivityService();
