/**
 * src/lib/passport/13-stamp-service.ts
 *
 * Stamp system service layer (WS3 PR2).
 *
 * Responsibilities:
 *   - Resolve a QR identifier to its target (rink | venue | event)
 *   - Validate that an actor can stamp a given target
 *   - Validate coach→player stamps require a shared team_members row
 *   - Insert stamp rows via service-role (supabaseAdmin)
 *   - Write scan_events audit rows for every attempt
 *
 * All RLS policies on public.stamps are scoped to actor_user_id,
 * subject_user_id, or visibility=public. Writes go through service-role
 * so the API route is the sole trust boundary.
 *
 * Per Workstream 1 Rule 6 (Zero Data Mutation): this service only writes
 * to public.stamps and public.scan_events. It never modifies existing
 * tables except via the rinks.qr_revoked_at timestamp (QR rotation — out
 * of v1, deferred to PR4).
 *
 * Per Rule 9 (No Existing Foreign Keys Change): only ADDS FKs from new
 * tables TO existing tables. No FKs from existing tables are added or
 * modified.
 */

import { supabaseAdmin } from '@/lib/supabase';
import type {
  CreateStampRequest,
  CreateStampResponse,
  ResolvedStampTarget,
  StampActorType,
  StampContext,
  StampSource,
  StampVisibility,
  StampStatus,
  StampRecord,
} from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COACHING_ROLES = new Set([
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'skills_coach',
]);

const GEO_DISTANCE_FLAG_THRESHOLD_METERS = 200_000; // 200 km

// Federation league set — must match the migration's federation_verified
// backfill list (supabase/migrations/2026-07-22_stamps_schema.sql §2c).
// Single source of truth lives in the migration; this set mirrors it so
// the public Passport aggregate counts only federation-verified leagues.
const FEDERATION_LEAGUES = new Set([
  'DEL',
  'DEL2',
  'DEL youth',
  'SHL',
  'Mestis',
  'HockeyAllsvenskan',
  'Hockeyettan',
  'Liiga',
  'Oberliga',
  'Oberliga Nord',
  'Division',
]);

/**
 * Map a raw Supabase row from public.stamps (snake_case) to a
 * StampRecord (camelCase). Mirrors the rowToRecord pattern in
 * 03-repository.ts.
 */
function stampRowToRecord(row: Record<string, unknown>): StampRecord {
  return {
    id: row.id as string,
    targetType: row.target_type as StampRecord['targetType'],
    targetRinkId: (row.target_rink_id as string | null) ?? null,
    targetVenueId: (row.target_venue_id as string | null) ?? null,
    targetEventId: (row.target_event_id as string | null) ?? null,
    actorUserId: row.actor_user_id as string,
    actorType: row.actor_type as StampRecord['actorType'],
    subjectUserId: (row.subject_user_id as string | null) ?? null,
    subjectType: (row.subject_type as StampRecord['subjectType']) ?? null,
    context: (row.context as StampRecord['context']) ?? null,
    source: row.source as StampRecord['source'],
    visibility: row.visibility as StampRecord['visibility'],
    status: row.status as StampRecord['status'],
    geoLat: (row.geo_lat as number | null) ?? null,
    geoLng: (row.geo_lng as number | null) ?? null,
    distanceMeters: (row.distance_meters as number | null) ?? null,
    stampedAt: row.stamped_at as string,
    // WS3.5 PR1 — adjudication fields, all nullable
    rejectedAt: (row.rejected_at as string | null) ?? null,
    rejectedByUserId: (row.rejected_by_user_id as string | null) ?? null,
    rejectedReason: (row.rejected_reason as string | null) ?? null,
  };
}

export class StampNotFoundError extends Error {
  constructor(qrIdentifier: string) {
    super(`No active target found for QR ${qrIdentifier}`);
    this.name = 'StampNotFoundError';
  }
}

export class StampRateLimitedError extends Error {
  constructor() {
    super('Already stamped this target today');
    this.name = 'StampRateLimitedError';
  }
}

export class StampForbiddenError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'StampForbiddenError';
  }
}

export class StampService {
  /**
   * Resolve a QR identifier to its target. Returns null if the identifier is
   * malformed, or if no active target exists. The QR resolver route uses this
   * to dispatch on target type.
   */
  async resolveTarget(qrIdentifier: string): Promise<ResolvedStampTarget | null> {
    if (!UUID_RE.test(qrIdentifier)) {
      return null;
    }

    // Look up across all three target tables in parallel. Each query is bounded
    // by an indexed UNIQUE constraint on public_id, so they're cheap.
    const [rinkRes, venueRes, eventRes] = await Promise.all([
      supabaseAdmin
        .from('rinks')
        .select('id, name, slug, verification_tier, qr_identifier, qr_revoked_at')
        .eq('qr_identifier', qrIdentifier)
        .is('qr_revoked_at', null)
        .maybeSingle(),
      supabaseAdmin
        .from('venues')
        .select('id, name, verification_tier, public_id, status')
        .eq('public_id', qrIdentifier)
        .eq('status', 'active')
        .maybeSingle(),
      supabaseAdmin
        .from('venue_events')
        .select(
          'id, name, starts_at, parent_type, parent_rink_id, parent_venue_id, public_id, status'
        )
        .eq('public_id', qrIdentifier)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    if (rinkRes.data) {
      return {
        targetType: 'rink',
        rinkId: rinkRes.data.id,
        rinkName: rinkRes.data.name,
        rinkSlug: rinkRes.data.slug,
        verificationTier: rinkRes.data.verification_tier,
        publicId: rinkRes.data.qr_identifier,
      };
    }

    if (venueRes.data) {
      return {
        targetType: 'venue',
        venueId: venueRes.data.id,
        venueName: venueRes.data.name,
        verificationTier: venueRes.data.verification_tier,
        publicId: venueRes.data.public_id,
      };
    }

    if (eventRes.data) {
      // Resolve parent name for display. Two-step because parent_type is polymorphic.
      let parentName = '';
      if (eventRes.data.parent_type === 'rink' && eventRes.data.parent_rink_id) {
        const { data: parent } = await supabaseAdmin
          .from('rinks')
          .select('name')
          .eq('id', eventRes.data.parent_rink_id)
          .maybeSingle();
        parentName = parent?.name ?? '';
      } else if (
        eventRes.data.parent_type === 'venue' &&
        eventRes.data.parent_venue_id
      ) {
        const { data: parent } = await supabaseAdmin
          .from('venues')
          .select('name')
          .eq('id', eventRes.data.parent_venue_id)
          .maybeSingle();
        parentName = parent?.name ?? '';
      }
      return {
        targetType: 'event',
        eventId: eventRes.data.id,
        eventName: eventRes.data.name,
        startsAt: eventRes.data.starts_at,
        parentType: eventRes.data.parent_type as 'rink' | 'venue',
        parentName,
        publicId: eventRes.data.public_id,
      };
    }

    return null;
  }

  /**
   * Validate that the actor can stamp the given target. Returns the resolved
   * actor type (from the user's profile role) or throws.
   *
   * Self-scan rules (source='self_scan'):
   *   - any signed-in user can stamp any active target
   *
   * Third-party-scan rules (source='third_party_scan'):
   *   - subject_user_id must be supplied
   *   - coach→player: the actor must have a coaching role AND share a team
   *     with the player via team_members (both rows active, left_at IS NULL)
   *   - rink_operator→player: deferred (operators aren't in the membership
   *     model; out of v1, addressed when WS3.5 admin lands)
   *   - tournament_organizer→player: deferred (same reason)
   */
  async resolveActorType(actorUserId: string): Promise<StampActorType | null> {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('account_type')
      .eq('user_id', actorUserId)
      .maybeSingle();

    if (!profile) return null;

    // Map profile.account_type → stamp actor_type. account_type is the
    // user-account persona (parent/coach/player/official/operator/generic).
    // See 2026-06-12_profiles_account_type.sql.
    switch (profile.account_type) {
      case 'player':
        return 'player';
      case 'parent':
        return 'parent';
      case 'coach':
        return 'coach';
      case 'official':
        return 'tournament_organizer';
      case 'operator':
        return 'rink_operator';
      default:
        return null;
    }
  }

  async validateCoachCanStampPlayer(
    coachUserId: string,
    playerUserId: string
  ): Promise<boolean> {
    if (coachUserId === playerUserId) return false;

    // Verify the coach has a coaching role on at least one active team_members
    // row, AND the player has an active team_members row on that same team.
    const { data: coachRows } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', coachUserId)
      .is('left_at', null);

    if (!coachRows || coachRows.length === 0) return false;

    const coachTeamIds = coachRows
      .filter((r) => COACHING_ROLES.has(r.role))
      .map((r) => r.team_id);

    if (coachTeamIds.length === 0) return false;

    const { data: playerRow } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', playerUserId)
      .in('team_id', coachTeamIds)
      .is('left_at', null)
      .limit(1)
      .maybeSingle();

    return !!playerRow;
  }

  /**
   * Compute distance in meters between two geo points (Haversine).
   * Returns null if either coordinate is missing.
   */
  private computeDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6_371_000; // earth radius in meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
  }

  /**
   * Create a stamp. Returns the stamp id and target info. Audit row is written
   * regardless of outcome.
   *
   * Rate-limit behavior: if the partial unique index rejects the INSERT
   * (already stamped this target today), we return alreadyStampedToday: true
   * and write an audit row with outcome='duplicate' rather than 'stamp_created'.
   */
  async createStamp(
    actorUserId: string,
    req: CreateStampRequest
  ): Promise<CreateStampResponse> {
    const target = await this.resolveTarget(req.qrIdentifier);
    if (!target) {
      await this.writeScanEvent(req.qrIdentifier, actorUserId, 'invalid_target', {
        reason: 'qr_not_found',
      });
      throw new StampNotFoundError(req.qrIdentifier);
    }

    const actorType = await this.resolveActorType(actorUserId);
    if (!actorType) {
      await this.writeScanEvent(req.qrIdentifier, actorUserId, 'error', {
        reason: 'unknown_actor_type',
      });
      throw new StampForbiddenError('Unknown actor type');
    }

    const source: StampSource = req.subjectUserId
      ? 'third_party_scan'
      : 'self_scan';
    const visibility: StampVisibility = req.visibility ?? 'private';

    // Third-party-scan validation. Coach→player requires shared team membership.
    if (source === 'third_party_scan') {
      if (!req.subjectUserId) {
        throw new StampForbiddenError('subject_user_id required for third-party scans');
      }
      if (actorType === 'coach') {
        const allowed = await this.validateCoachCanStampPlayer(
          actorUserId,
          req.subjectUserId
        );
        if (!allowed) {
          await this.writeScanEvent(
            req.qrIdentifier,
            actorUserId,
            'invalid_target',
            { reason: 'coach_player_not_linked' }
          );
          throw new StampForbiddenError(
            'Coach must share an active team with the player to stamp'
          );
        }
      } else if (actorType === 'parent') {
        // Parent → child: handled in WS3.5 (Family Hub multi-stamp). v1
        // disallows third-party scans from non-coach actors to keep the
        // privacy model tight.
        throw new StampForbiddenError(
          'Parent third-party stamps are WS3.5 (Family Hub) — out of v1'
        );
      } else {
        throw new StampForbiddenError(
          `Actor type ${actorType} cannot perform third-party scans in v1`
        );
      }
    }

    // Geo validation: flag (don't block) if distance > 200km and target has
    // coordinates. Rink targets with location, venue targets with location.
    let distanceMeters: number | null = null;
    let flagged = false;

    if (
      req.geoLat != null &&
      req.geoLng != null &&
      target.targetType === 'rink'
    ) {
      const { data: rinkGeo } = await supabaseAdmin
        .from('rinks')
        .select('latitude, longitude')
        .eq('id', target.rinkId)
        .maybeSingle();
      if (rinkGeo?.latitude != null && rinkGeo?.longitude != null) {
        distanceMeters = this.computeDistanceMeters(
          req.geoLat,
          req.geoLng,
          rinkGeo.latitude,
          rinkGeo.longitude
        );
        if (distanceMeters > GEO_DISTANCE_FLAG_THRESHOLD_METERS) {
          flagged = true;
        }
      }
    }

    const insertRow: Partial<StampRecord> & Record<string, unknown> = {
      target_type: target.targetType,
      target_rink_id: target.targetType === 'rink' ? target.rinkId : null,
      target_venue_id: target.targetType === 'venue' ? target.venueId : null,
      target_event_id: target.targetType === 'event' ? target.eventId : null,
      actor_user_id: actorUserId,
      actor_type: actorType,
      subject_user_id: req.subjectUserId ?? null,
      subject_type: req.subjectUserId ? 'player' : null,
      context: req.context ?? null,
      source,
      visibility,
      status: 'confirmed',
      geo_lat: req.geoLat ?? null,
      geo_lng: req.geoLng ?? null,
      distance_meters: distanceMeters,
      stamped_at: new Date().toISOString(),
    };

    const { data: stamp, error } = await supabaseAdmin
      .from('stamps')
      .insert(insertRow)
      .select('id')
      .single();

    if (error) {
      // Partial unique index hit → already stamped today.
      // Postgres error code 23505 = unique_violation.
      if (error.code === '23505') {
        await this.writeScanEvent(req.qrIdentifier, actorUserId, 'duplicate', {
          target_type: target.targetType,
        });
        return {
          stampId: '',
          targetType: target.targetType,
          targetName: this.targetName(target),
          visibility,
          alreadyStampedToday: true,
        };
      }
      await this.writeScanEvent(req.qrIdentifier, actorUserId, 'error', {
        code: error.code,
        message: error.message,
      });
      throw error;
    }

    await this.writeScanEvent(
      req.qrIdentifier,
      actorUserId,
      flagged ? 'flagged_dispute' : 'stamp_created',
      {
        target_type: target.targetType,
        distance_meters: distanceMeters,
      }
    );

    // If this was a coach→player stamp, create a consumer notification for
    // the player so the in-app inbox shows "Coach X stamped you at <rink>".
    // Idempotent via UNIQUE (user_id, source_key, kind) — same stamp id is
    // the source_key.
    if (source === 'third_party_scan' && req.subjectUserId) {
      await this.notifyStampReceived({
        subjectUserId: req.subjectUserId,
        stampId: stamp.id,
        actorUserId,
        target,
        context: req.context ?? null,
      });
    }

    return {
      stampId: stamp.id,
      targetType: target.targetType,
      targetName: this.targetName(target),
      visibility,
      alreadyStampedToday: false,
    };
  }

  private targetName(t: ResolvedStampTarget): string {
    switch (t.targetType) {
      case 'rink':
        return t.rinkName;
      case 'venue':
        return t.venueName;
      case 'event':
        return `${t.eventName} (at ${t.parentName})`;
    }
  }

  private async notifyStampReceived(params: {
    subjectUserId: string;
    stampId: string;
    actorUserId: string;
    target: ResolvedStampTarget;
    context: StampContext | null;
  }): Promise<void> {
    const targetName = this.targetName(params.target);
    const contextSuffix = params.context ? ` (${params.context})` : '';
    const title = 'You received a Passport stamp';
    const body = `Coach stamped your Passport at ${targetName}${contextSuffix}.`;

    // Idempotent: source_key is the stamp id. Re-running for the same stamp
    // is a no-op via UNIQUE (user_id, source_key, kind).
    const { error } = await supabaseAdmin
      .from('consumer_notifications')
      .insert({
        user_id: params.subjectUserId,
        kind: 'stamp_received',
        source_key: `stamp:${params.stampId}`,
        title,
        body,
        metadata: {
          stamp_id: params.stampId,
          actor_user_id: params.actorUserId,
          target_type: params.target.targetType,
          context: params.context,
        },
      });

    // ON CONFLICT DO NOTHING is implicit via the UNIQUE constraint on
    // (user_id, source_key, kind). Supabase returns a 23505 error code which
    // we treat as success (idempotent re-run).
    if (error && error.code !== '23505') {
      console.error(
        '[stamp-service] notifyStampReceived insert failed:',
        error
      );
      // Don't throw — the stamp itself succeeded; notification failure is
      // recoverable (player can still see the stamp in their dashboard).
    }
  }

  private async writeScanEvent(
    qrIdentifier: string,
    actorUserId: string | null,
    outcome: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabaseAdmin.from('scan_events').insert({
      qr_identifier: qrIdentifier,
      actor_user_id: actorUserId,
      outcome,
      details,
    });
    if (error) {
      // Audit failures are logged but never propagated — the user's stamp
      // shouldn't fail because the audit row didn't write.
      console.error('[stamp-service] scan_events insert failed:', error);
    }
  }

  /**
   * Public attendance aggregate for a Passport holder.
   *
   * Per locked rule 2026-07-22: a holder's public Passport counts stamps
   * where actor_user_id = holder OR subject_user_id = holder. That covers
   * both self-scans and coach→player scans (the player was physically
   * present regardless of who held the phone).
   *
   * Per WS3 plan: public surface shows rink aggregate count + event names.
   * Venue-only stamps stay private (they're aggregate-only signals on the
   * holder's dashboard, not public credits).
   *
   * Returns:
   *   - rinks: distinct rink ids the holder has stamped publicly
   *   - events: distinct event names + parent venue/rink names
   *   - federations: count of distinct federation affiliations touched
   *     (rink.league values for federation_verified rinks the holder
   *     stamped). Derives from existing rinks.league column.
   */
  async getPublicAttendance(holderUserId: string): Promise<{
    rinkCount: number;
    eventCount: number;
    federationCount: number;
    rinks: Array<{ id: string; name: string; slug: string }>;
    events: Array<{
      id: string;
      name: string;
      parentType: 'rink' | 'venue';
      parentName: string;
      startsAt: string;
    }>;
  }> {
    // Fetch public-visible confirmed stamps for the holder.
    const { data: stamps, error } = await supabaseAdmin
      .from('stamps')
      .select(
        'id, target_type, target_rink_id, target_venue_id, target_event_id, stamped_at'
      )
      .or(`actor_user_id.eq.${holderUserId},subject_user_id.eq.${holderUserId}`)
      .eq('visibility', 'public')
      .eq('status', 'confirmed');

    if (error) {
      console.error('[stamp-service] getPublicAttendance failed:', error);
      return {
        rinkCount: 0,
        eventCount: 0,
        federationCount: 0,
        rinks: [],
        events: [],
      };
    }

    const rows = stamps ?? [];
    const rinkIds = Array.from(
      new Set(
        rows
          .filter((s) => s.target_type === 'rink' && s.target_rink_id)
          .map((s) => s.target_rink_id as string)
      )
    );
    const eventIds = Array.from(
      new Set(
        rows
          .filter((s) => s.target_type === 'event' && s.target_event_id)
          .map((s) => s.target_event_id as string)
      )
    );

    let rinks: Array<{ id: string; name: string; slug: string }> = [];
    if (rinkIds.length > 0) {
      const { data: rinkRows } = await supabaseAdmin
        .from('rinks')
        .select('id, name, slug, league')
        .in('id', rinkIds);
      rinks = (rinkRows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
      }));
    }

    let events: Array<{
      id: string;
      name: string;
      parentType: 'rink' | 'venue';
      parentName: string;
      startsAt: string;
    }> = [];
    if (eventIds.length > 0) {
      const { data: eventRows } = await supabaseAdmin
        .from('venue_events')
        .select(
          'id, name, starts_at, parent_type, parent_rink_id, parent_venue_id'
        )
        .in('id', eventIds);

      const parentRinkIds = (eventRows ?? [])
        .filter((e) => e.parent_type === 'rink' && e.parent_rink_id)
        .map((e) => e.parent_rink_id as string);
      const parentVenueIds = (eventRows ?? [])
        .filter((e) => e.parent_type === 'venue' && e.parent_venue_id)
        .map((e) => e.parent_venue_id as string);

      const [parentRinkRows, parentVenueRows] = await Promise.all([
        parentRinkIds.length > 0
          ? supabaseAdmin
              .from('rinks')
              .select('id, name')
              .in('id', parentRinkIds)
              .then((r) => r.data ?? [])
          : Promise.resolve([] as Array<{ id: string; name: string }>),
        parentVenueIds.length > 0
          ? supabaseAdmin
              .from('venues')
              .select('id, name')
              .in('id', parentVenueIds)
              .then((r) => r.data ?? [])
          : Promise.resolve([] as Array<{ id: string; name: string }>),
      ]);

      const rinkNameMap = new Map(
        parentRinkRows.map((r) => [r.id, r.name] as const)
      );
      const venueNameMap = new Map(
        parentVenueRows.map((v) => [v.id, v.name] as const)
      );

      events = (eventRows ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        parentType: e.parent_type as 'rink' | 'venue',
        parentName:
          e.parent_type === 'rink'
            ? rinkNameMap.get(e.parent_rink_id ?? '') ?? ''
            : venueNameMap.get(e.parent_venue_id ?? '') ?? '',
        startsAt: e.starts_at,
      }));
    }

    // Federation count: distinct league values on rinks the holder stamped
    // publicly, restricted to known federation leagues (matches the
    // verification_tier backfill list from PR1). Re-query with the league
    // column after the rinks[] array was built so the earlier query stays
    // lean (only id/name/slug).
    let federationCount = 0;
    if (rinkIds.length > 0) {
      const { data: leagueRows } = await supabaseAdmin
        .from('rinks')
        .select('league')
        .in('id', rinkIds);
      const leagues = new Set(
        (leagueRows ?? [])
          .map((r) => r.league)
          .filter((l): l is string => !!l && FEDERATION_LEAGUES.has(l))
      );
      federationCount = leagues.size;
    }

    return {
      rinkCount: rinks.length,
      eventCount: events.length,
      federationCount,
      rinks,
      events,
    };
  }

  /**
   * Full stamp history for a holder (dashboard view).
   *
   * Returns ALL stamps where the holder is the actor or the subject,
   * regardless of visibility. The dashboard is the holder's private
   * space — they see everything attached to their Passport.
   *
   * Sort: most recent first.
   */
  async getHolderStamps(holderUserId: string): Promise<
    Array<
      StampRecord & {
        rinkName: string | null;
        venueName: string | null;
        eventName: string | null;
        parentName: string | null;
      }
    >
  > {
    const { data: stampRows, error } = await supabaseAdmin
      .from('stamps')
      .select('*')
      .or(`actor_user_id.eq.${holderUserId},subject_user_id.eq.${holderUserId}`)
      .order('stamped_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[stamp-service] getHolderStamps failed:', error);
      return [];
    }

    const rows = (stampRows ?? []).map(stampRowToRecord);
    if (rows.length === 0) return [];

    const rinkIds = Array.from(
      new Set(
        rows
          .filter((r) => r.targetRinkId)
          .map((r) => r.targetRinkId as string)
      )
    );
    const venueIds = Array.from(
      new Set(
        rows
          .filter((r) => r.targetVenueId)
          .map((r) => r.targetVenueId as string)
      )
    );
    const eventIds = Array.from(
      new Set(
        rows
          .filter((r) => r.targetEventId)
          .map((r) => r.targetEventId as string)
      )
    );

    const [rinkRows, venueRows, eventRows] = await Promise.all([
      rinkIds.length > 0
        ? supabaseAdmin
            .from('rinks')
            .select('id, name')
            .in('id', rinkIds)
            .then((r) => r.data ?? [])
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      venueIds.length > 0
        ? supabaseAdmin
            .from('venues')
            .select('id, name')
            .in('id', venueIds)
            .then((r) => r.data ?? [])
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      eventIds.length > 0
        ? supabaseAdmin
            .from('venue_events')
            .select(
              'id, name, parent_type, parent_rink_id, parent_venue_id'
            )
            .in('id', eventIds)
            .then((r) => r.data ?? [])
        : Promise.resolve(
            [] as Array<{
              id: string;
              name: string;
              parent_type: string;
              parent_rink_id: string | null;
              parent_venue_id: string | null;
            }>
          ),
    ]);

    const rinkMap = new Map(rinkRows.map((r) => [r.id, r.name] as const));
    const venueMap = new Map(venueRows.map((v) => [v.id, v.name] as const));
    const parentRinkIds = (eventRows ?? [])
      .filter((e) => e.parent_type === 'rink' && e.parent_rink_id)
      .map((e) => e.parent_rink_id as string);
    const parentVenueIds = (eventRows ?? [])
      .filter((e) => e.parent_type === 'venue' && e.parent_venue_id)
      .map((e) => e.parent_venue_id as string);

    const [parentRinkRows, parentVenueRows] = await Promise.all([
      parentRinkIds.length > 0
        ? supabaseAdmin
            .from('rinks')
            .select('id, name')
            .in('id', parentRinkIds)
            .then((r) => r.data ?? [])
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      parentVenueIds.length > 0
        ? supabaseAdmin
            .from('venues')
            .select('id, name')
            .in('id', parentVenueIds)
            .then((r) => r.data ?? [])
        : Promise.resolve([] as Array<{ id: string; name: string }>),
    ]);

    const eventParentRinkMap = new Map(
      parentRinkRows.map((r) => [r.id, r.name] as const)
    );
    const eventParentVenueMap = new Map(
      parentVenueRows.map((v) => [v.id, v.name] as const)
    );

    return rows.map((s) => {
      let parentName: string | null = null;
      if (s.targetEventId) {
        const ev = (eventRows ?? []).find((e) => e.id === s.targetEventId);
        if (ev) {
          parentName =
            ev.parent_type === 'rink'
              ? ev.parent_rink_id
                ? eventParentRinkMap.get(ev.parent_rink_id) ?? null
                : null
              : ev.parent_venue_id
                ? eventParentVenueMap.get(ev.parent_venue_id) ?? null
                : null;
        }
      }
      return {
        ...s,
        rinkName: s.targetRinkId ? rinkMap.get(s.targetRinkId) ?? null : null,
        venueName: s.targetVenueId
          ? venueMap.get(s.targetVenueId) ?? null
          : null,
        eventName: s.targetEventId
          ? (eventRows ?? []).find((e) => e.id === s.targetEventId)?.name ??
            null
          : null,
        parentName,
      };
    });
  }

  /**
   * Update a stamp's visibility. Per locked rule 2026-07-22:
   *   - self-scan stamps: holder (actor_user_id) may toggle
   *   - coach→player stamps: subject_user_id may toggle; actor (coach)
   *     cannot toggle their own authored stamp
   *   - anyone else: 403
   *
   * Returns the updated visibility, or throws.
   */
  async updateStampVisibility(
    callerUserId: string,
    stampId: string,
    newVisibility: StampVisibility
  ): Promise<StampVisibility> {
    const { data: stamp, error } = await supabaseAdmin
      .from('stamps')
      .select('id, actor_user_id, subject_user_id, status')
      .eq('id', stampId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load stamp: ${error.message}`);
    }
    if (!stamp) {
      throw new StampNotFoundError(stampId);
    }
    if (stamp.status === 'revoked') {
      throw new StampForbiddenError(
        'Cannot change visibility of a revoked stamp'
      );
    }

    const isHolder = stamp.actor_user_id === callerUserId;
    const isSubject = stamp.subject_user_id === callerUserId;
    if (!isHolder && !isSubject) {
      throw new StampForbiddenError(
        'Only the holder or subject of this stamp can change its visibility'
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from('stamps')
      .update({ visibility: newVisibility })
      .eq('id', stampId);

    if (updateErr) {
      throw new Error(`Failed to update visibility: ${updateErr.message}`);
    }
    return newVisibility;
  }

  /**
   * WS3 PR4 — Dispute a stamp.
   *
   * Per locked rule 2026-07-22: only the SUBJECT of a third-party scan can
   * dispute. Self-scan disputes are not a thing (you stamped yourself; the
   * 'undo' path is delete-via-dispute, which is silly).
   *
   * Behavior:
   *   - Loads stamp; 404 if missing; 403 if caller isn't the subject
   *   - Sets status='disputed' on the stamp row
   *   - Writes an audit row to public.scan_events with outcome='flagged_dispute'
   *     so fraud signals pick up the dispute
   *   - Stays in 'disputed' status (not auto-revoked) — the WS3.5 admin queue
   *     resolves disputes. Until then, the stamp hides from public aggregate
   *     counts (getPublicAttendance filters status='confirmed').
   */
  async disputeStamp(
    callerUserId: string,
    stampId: string,
    reason?: string
  ): Promise<{ stampId: string; status: StampStatus }> {
    const { data: stamp, error } = await supabaseAdmin
      .from('stamps')
      .select('id, subject_user_id, actor_user_id, status')
      .eq('id', stampId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load stamp: ${error.message}`);
    }
    if (!stamp) {
      throw new StampNotFoundError(stampId);
    }
    if (stamp.subject_user_id !== callerUserId) {
      throw new StampForbiddenError(
        'Only the subject of a third-party stamp can dispute it'
      );
    }
    if (stamp.status === 'revoked') {
      throw new StampForbiddenError(
        'Cannot dispute a revoked stamp'
      );
    }
    if (stamp.status === 'disputed') {
      // Idempotent — already disputed, return current state.
      return { stampId, status: 'disputed' };
    }

    const { error: updateErr } = await supabaseAdmin
      .from('stamps')
      .update({
        status: 'disputed',
        // Store the reason in details-style metadata via a separate column
        // would require a schema change; v1 keeps the reason in the audit
        // row only (public.scan_events.details).
      })
      .eq('id', stampId);

    if (updateErr) {
      throw new Error(`Failed to update stamp status: ${updateErr.message}`);
    }

    await this.writeScanEventForDispute(
      stampId,
      callerUserId,
      reason ?? null
    );

    return { stampId, status: 'disputed' };
  }

  /**
   * WS3 PR4 — QR rotation utility (rink | venue | event).
   *
   * Admin-only operation (gated by getAdminFromRequest in the route).
   *
   * Behavior:
   *   - Generate new qr_identifier (uuid for rinks) or public_id (venue/event)
   *   - Update the target's column
   *   - Set qr_revoked_at on rinks (the schema column on rinks); venues and
   *     events don't have qr_revoked_at in v1 (they use public_id which
   *     rotates, and the audit trail in qr_revocations is the source of
   *     truth for the old value)
   *   - Insert audit row in public.qr_revocations with old + new + reason +
   *     revoker
   *
   * Existing stamps stay valid (per WS3 plan: 'don't punish holders for
   * venue compromise'). The QR resolver (src/app/qr/[qrIdentifier]/route.ts)
   * resolves the new identifier going forward; old identifiers won't match
   * any active target and fall through to the deactivated page.
   */
  async rotateQr(params: {
    targetType: 'rink' | 'venue' | 'event';
    targetId: string;
    reason: string;
    revokedByUserId: string;
  }): Promise<{ targetType: string; oldQr: string; newQr: string }> {
    const { targetType, targetId, reason, revokedByUserId } = params;

    if (targetType === 'rink') {
      const { data: rink, error } = await supabaseAdmin
        .from('rinks')
        .select('id, qr_identifier, qr_revoked_at')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw new Error(`rink lookup failed: ${error.message}`);
      if (!rink) throw new StampNotFoundError(`rink:${targetId}`);
      if (!rink.qr_identifier) {
        throw new StampForbiddenError(
          'Rink has no qr_identifier; cannot rotate'
        );
      }
      if (rink.qr_revoked_at) {
        // Already revoked — don't double-rotate. Return current state.
        return {
          targetType: 'rink',
          oldQr: rink.qr_identifier,
          newQr: rink.qr_identifier,
        };
      }

      const newQr = crypto.randomUUID();

      const { error: updateErr } = await supabaseAdmin
        .from('rinks')
        .update({
          qr_identifier: newQr,
          qr_revoked_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      if (updateErr) {
        throw new Error(`rink update failed: ${updateErr.message}`);
      }

      await supabaseAdmin.from('qr_revocations').insert({
        target_type: 'rink',
        target_rink_id: targetId,
        target_venue_id: null,
        target_event_id: null,
        old_qr_identifier: rink.qr_identifier,
        new_qr_identifier: newQr,
        reason,
        revoked_by_user_id: revokedByUserId,
      });

      return {
        targetType: 'rink',
        oldQr: rink.qr_identifier,
        newQr,
      };
    }

    if (targetType === 'venue') {
      const { data: venue, error } = await supabaseAdmin
        .from('venues')
        .select('id, public_id, status')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw new Error(`venue lookup failed: ${error.message}`);
      if (!venue) throw new StampNotFoundError(`venue:${targetId}`);

      const newQr = crypto.randomUUID();

      const { error: updateErr } = await supabaseAdmin
        .from('venues')
        .update({ public_id: newQr })
        .eq('id', targetId);

      if (updateErr) {
        throw new Error(`venue update failed: ${updateErr.message}`);
      }

      await supabaseAdmin.from('qr_revocations').insert({
        target_type: 'venue',
        target_rink_id: null,
        target_venue_id: targetId,
        target_event_id: null,
        old_qr_identifier: venue.public_id,
        new_qr_identifier: newQr,
        reason,
        revoked_by_user_id: revokedByUserId,
      });

      return {
        targetType: 'venue',
        oldQr: venue.public_id,
        newQr,
      };
    }

    if (targetType === 'event') {
      const { data: event, error } = await supabaseAdmin
        .from('venue_events')
        .select('id, public_id, status')
        .eq('id', targetId)
        .maybeSingle();

      if (error) throw new Error(`event lookup failed: ${error.message}`);
      if (!event) throw new StampNotFoundError(`event:${targetId}`);

      const newQr = crypto.randomUUID();

      const { error: updateErr } = await supabaseAdmin
        .from('venue_events')
        .update({ public_id: newQr })
        .eq('id', targetId);

      if (updateErr) {
        throw new Error(`event update failed: ${updateErr.message}`);
      }

      await supabaseAdmin.from('qr_revocations').insert({
        target_type: 'event',
        target_rink_id: null,
        target_venue_id: null,
        target_event_id: targetId,
        old_qr_identifier: event.public_id,
        new_qr_identifier: newQr,
        reason,
        revoked_by_user_id: revokedByUserId,
      });

      return {
        targetType: 'event',
        oldQr: event.public_id,
        newQr,
      };
    }

    throw new StampForbiddenError(`Unknown targetType: ${targetType}`);
  }

  private async writeScanEventForDispute(
    stampId: string,
    callerUserId: string,
    reason: string | null
  ): Promise<void> {
    // Look up the stamp's qr_identifier so the audit row references the
    // identifier, not the stamp id. This keeps scan_events and stamps
    // queryable via the same key (qr_identifier) for fraud analysis.
    const { data: stamp } = await supabaseAdmin
      .from('stamps')
      .select('target_rink_id, target_venue_id, target_event_id')
      .eq('id', stampId)
      .maybeSingle();

    let qrIdentifier: string | null = null;
    if (stamp?.target_rink_id) {
      const { data: rink } = await supabaseAdmin
        .from('rinks')
        .select('qr_identifier')
        .eq('id', stamp.target_rink_id)
        .maybeSingle();
      qrIdentifier = rink?.qr_identifier ?? null;
    } else if (stamp?.target_venue_id) {
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('public_id')
        .eq('id', stamp.target_venue_id)
        .maybeSingle();
      qrIdentifier = venue?.public_id ?? null;
    } else if (stamp?.target_event_id) {
      const { data: event } = await supabaseAdmin
        .from('venue_events')
        .select('public_id')
        .eq('id', stamp.target_event_id)
        .maybeSingle();
      qrIdentifier = event?.public_id ?? null;
    }

    if (!qrIdentifier) {
      // Stamp target has no qr_identifier (shouldn't happen for confirmed
      // stamps, but degrade safely).
      return;
    }

    await this.writeScanEvent(qrIdentifier, callerUserId, 'flagged_dispute', {
      stamp_id: stampId,
      reason,
    });
  }
}

export const stampService = new StampService();
