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
}

export const stampService = new StampService();
