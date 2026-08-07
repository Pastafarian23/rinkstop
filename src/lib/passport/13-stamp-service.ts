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
  DisputedStampRow,
  ResolvedStampTarget,
  StaffDisputedStampRow,
  StampActorType,
  StampContext,
  StampSource,
  StampTargetType,
  StampVisibility,
  StampStatus,
  StampRecord,
} from './types';
import {
  canAdjudicateOn,
  getAuthorizationContext,
  isPermissionsV2Enabled,
} from './14-authorization';

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
    subjectPassportId: (row.subject_passport_id as string | null) ?? null,
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
   * WS3.5 PR5 — List the Passports that `userId` is eligible to stamp
   * on behalf of. Used by the Family Hub Multi-Stamp picker UI on
   * /stamp/[qrIdentifier] when the caller has 2+ eligible Passports.
   *
   * Eligibility rule (per WS3.5 spec):
   *   1. Caller's own Passport (always eligible if they have one).
   *   2. Passports owned by managed_profiles.profile_id where the caller
   *      is the manager AND relationship IN ('parent', 'guardian') AND
   *      the kid's Passport is verified (verification_level != 'none').
   *
   * Returns an empty array if the caller has 0 eligible Passports (the
   * picker UI surfaces "you need a verified Passport or a linked
   * child to stamp here"). Returns 1 entry if the caller only has
   * their own Passport (picker hidden, behavior unchanged). Returns
   * 2+ entries when the caller has their own + at least one linked
   * kid — the picker shows.
   *
   * Sorting: own first, then kids by age (youngest first). Age comes
   * from profiles.date_of_birth. Kids without a known age go last.
   */
  async listEligiblePassportsForStamping(
    userId: string
  ): Promise<Array<{
    passportId: string;
    internalUserId: string;
    displayName: string;
    ageYears: number | null;
    relationship: 'self' | 'parent' | 'guardian';
    verificationLevel: string;
  }>> {
    const out: Array<{
      passportId: string;
      internalUserId: string;
      displayName: string;
      ageYears: number | null;
      relationship: 'self' | 'parent' | 'guardian';
      verificationLevel: string;
    }> = [];

    // 1. Caller's own Passport.
    const { data: ownPassport, error: ownErr } = await supabaseAdmin
      .from('passports')
      .select('passport_id, internal_user_id, verification_level')
      .eq('internal_user_id', userId)
      .maybeSingle();
    if (ownErr) {
      throw new Error(`Failed to load caller's Passport: ${ownErr.message}`);
    }
    if (ownPassport) {
      const { data: ownProfile } = await supabaseAdmin
        .from('profiles')
        .select('display_name, first_name, last_name, date_of_birth')
        .eq('user_id', userId)
        .maybeSingle();
      const displayName =
        ownProfile?.display_name ||
        `${ownProfile?.first_name ?? ''} ${ownProfile?.last_name ?? ''}`.trim() ||
        'You';
      const ageYears = this.ageFromDob(ownProfile?.date_of_birth as string | null);
      out.push({
        passportId: ownPassport.passport_id as string,
        internalUserId: ownPassport.internal_user_id as string,
        displayName,
        ageYears,
        relationship: 'self',
        verificationLevel: (ownPassport.verification_level as string) ?? 'none',
      });
    }

    // 2. Linked kids via managed_profiles.
    const { data: links, error: linksErr } = await supabaseAdmin
      .from('managed_profiles')
      .select('profile_id, relationship')
      .eq('manager_user_id', userId)
      .in('relationship', ['parent', 'guardian'])
      .eq('profile_type', 'player');
    if (linksErr) {
      throw new Error(`Failed to load managed_profiles: ${linksErr.message}`);
    }
    if (links && links.length > 0) {
      // managed_profiles.profile_id is a UUID pointing to a player
      // profile. Resolve that profile → user_id → Passport.
      const playerIds = links.map((l) => l.profile_id as string);
      const { data: playerProfiles, error: playerErr } = await supabaseAdmin
        .from('players')
        .select('id, user_id')
        .in('id', playerIds);
      if (playerErr) {
        // players table may have a different shape than expected — fail
        // gracefully (no kids in picker, but caller's own still works).
        console.warn(
          '[stamp-service] listEligiblePassportsForStamping: players lookup failed:',
          playerErr.message
        );
      } else if (playerProfiles && playerProfiles.length > 0) {
        const userIds = playerProfiles
          .map((p) => p.user_id as string | null)
          .filter((u): u is string => typeof u === 'string' && u.length > 0);
        if (userIds.length > 0) {
          // Resolve kid Passports.
          const { data: kidPassports } = await supabaseAdmin
            .from('passports')
            .select('passport_id, internal_user_id, verification_level, status')
            .in('internal_user_id', userIds);
          const kidPassportByUser = new Map<string, { passportId: string; verificationLevel: string; status: string }>();
          for (const kp of kidPassports ?? []) {
            kidPassportByUser.set(kp.internal_user_id as string, {
              passportId: kp.passport_id as string,
              verificationLevel: (kp.verification_level as string) ?? 'none',
              status: (kp.status as string) ?? 'active',
            });
          }
          // Resolve kid display name + DOB from profiles (the source of
          // truth for first_name / last_name / date_of_birth — players
          // table has user_id but not those columns in v1).
          const { data: kidProfiles } = await supabaseAdmin
            .from('profiles')
            .select('user_id, display_name, first_name, last_name, date_of_birth')
            .in('user_id', userIds);
          const kidProfileByUser = new Map<string, { displayName: string; dateOfBirth: string | null }>();
          for (const kp of kidProfiles ?? []) {
            const displayName =
              kp.display_name ||
              `${kp.first_name ?? ''} ${kp.last_name ?? ''}`.trim() ||
              'Linked player';
            kidProfileByUser.set(kp.user_id as string, {
              displayName,
              dateOfBirth: (kp.date_of_birth as string | null) ?? null,
            });
          }
          for (const link of links) {
            const player = playerProfiles.find(
              (p) => p.id === (link.profile_id as string)
            );
            if (!player || !player.user_id) continue;
            const passport = kidPassportByUser.get(player.user_id as string);
            if (!passport) continue;
            // Skip kids with no verification (per spec: must be verified).
            if (passport.verificationLevel === 'none') continue;
            // Skip deactivated Passports.
            if (passport.status === 'deactivated' || passport.status === 'suspended') continue;
            const profile = kidProfileByUser.get(player.user_id as string);
            out.push({
              passportId: passport.passportId,
              internalUserId: player.user_id as string,
              displayName: profile?.displayName ?? 'Linked player',
              ageYears: this.ageFromDob(profile?.dateOfBirth ?? null),
              relationship: link.relationship as 'parent' | 'guardian',
              verificationLevel: passport.verificationLevel,
            });
          }
        }
      }
    }

    // Sort: own first, then kids by age (youngest first), then kids
    // with no known age last. Stable within age groups.
    out.sort((a, b) => {
      if (a.relationship === 'self' && b.relationship !== 'self') return -1;
      if (b.relationship === 'self' && a.relationship !== 'self') return 1;
      const aAge = a.ageYears ?? Number.MAX_SAFE_INTEGER;
      const bAge = b.ageYears ?? Number.MAX_SAFE_INTEGER;
      return aAge - bAge;
    });

    return out;
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
      // No target resolved — qr_identifier is malformed or no active target exists.
      // venue_id cannot be determined without a resolved target.
      await this.writeScanEvent(req.qrIdentifier, actorUserId, 'invalid_target', {
        reason: 'qr_not_found',
      });
      throw new StampNotFoundError(req.qrIdentifier);
    }

    const actorType = await this.resolveActorType(actorUserId);
    if (!actorType) {
      // Actor type unknown — cannot determine authorization. venue_id not
      // available without a resolved target (actor check runs before target
      // validation in the stamp flow).
      await this.writeScanEvent(req.qrIdentifier, actorUserId, 'error', {
        reason: 'unknown_actor_type',
      });
      throw new StampForbiddenError('Unknown actor type');
    }

    const source: StampSource = req.subjectUserId
      ? 'third_party_scan'
      : 'self_scan';
    const visibility: StampVisibility = req.visibility ?? 'private';

    // WS3.5 PR6 — resolve the subject_passport_id for this stamp.
    //   - If caller provided subjectPassportId explicitly (Family Hub
    //     picker UI passes the kid's passport_id), use it directly.
    //   - Otherwise resolve from subject_user_id (third-party) or
    //     actor_user_id (self-scan). Look up passports.internal_user_id.
    //   - If resolution fails (caller/subject has no Passport), throw
    //     a clear error so the UI can surface "verify your Passport
    //     first".
    let subjectPassportId: string | null = req.subjectPassportId ?? null;
    if (!subjectPassportId) {
      const resolveUserId = req.subjectUserId ?? actorUserId;
      const { data: passportRow, error: passportErr } = await supabaseAdmin
        .from('passports')
        .select('passport_id, status')
        .eq('internal_user_id', resolveUserId)
        .maybeSingle();
      if (passportErr) {
        throw new Error(
          `Failed to resolve subject passport: ${passportErr.message}`
        );
      }
      if (!passportRow) {
        throw new StampForbiddenError(
          req.subjectUserId
            ? 'Subject has no Passport; cannot stamp'
            : 'You need a verified Passport to stamp here'
        );
      }
      // Active or pending Passports are acceptable for stamping. We do
      // not block on 'suspended' / 'deactivated' — those checks are
      // elsewhere (Passport auth flow). v1: any Passport with a row
      // counts as valid for stamp attribution.
      subjectPassportId = passportRow.passport_id as string;
    }

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
          const venueId = await this.resolveVenueIdFromTarget(target);
          await this.writeScanEvent(
            req.qrIdentifier,
            actorUserId,
            'invalid_target',
            { reason: 'coach_player_not_linked' },
            venueId
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
      subject_passport_id: subjectPassportId,
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
        const venueId = await this.resolveVenueIdFromTarget(target);
        await this.writeScanEvent(req.qrIdentifier, actorUserId, 'duplicate', {
          target_type: target.targetType,
        }, venueId);
        return {
          stampId: '',
          targetType: target.targetType,
          targetName: this.targetName(target),
          visibility,
          alreadyStampedToday: true,
        };
      }
      const venueId = await this.resolveVenueIdFromTarget(target);
      await this.writeScanEvent(req.qrIdentifier, actorUserId, 'error', {
        code: error.code,
        message: error.message,
      }, venueId);
      throw error;
    }

    const venueId = await this.resolveVenueIdFromTarget(target);
    await this.writeScanEvent(
      req.qrIdentifier,
      actorUserId,
      flagged ? 'flagged_dispute' : 'stamp_created',
      {
        target_type: target.targetType,
        distance_meters: distanceMeters,
      },
      venueId
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

  /**
   * Resolve the venue_id for RLS from a resolved stamp target.
   * Used to populate scan_events.venue_id at write time.
   *
   *   rink:   look up venue_events.parent_venue_id for the rink (best-effort;
   *            a rink may have zero or many venues; takes the first)
   *   venue:  direct reference — target.venueId
   *   event:  look up venue_events.parent_venue_id for the event
   */
  private async resolveVenueIdFromTarget(
    target: ResolvedStampTarget
  ): Promise<string | null> {
    if (target.targetType === 'venue' && target.venueId) {
      return target.venueId;
    }
    if (target.targetType === 'event' && target.eventId) {
      const { data } = await supabaseAdmin
        .from('venue_events')
        .select('parent_venue_id')
        .eq('id', target.eventId)
        .maybeSingle();
      return data?.parent_venue_id ?? null;
    }
    if (target.targetType === 'rink' && target.rinkId) {
      const { data } = await supabaseAdmin
        .from('venue_events')
        .select('parent_venue_id')
        .eq('parent_rink_id', target.rinkId)
        .maybeSingle();
      return data?.parent_venue_id ?? null;
    }
    return null;
  }

  /**
   * WS3.5 PR5 — Convert an ISO date_of_birth to an age in years (rounded
   * down). Returns null if the input is null/invalid.
   */
  private ageFromDob(dob: string | null): number | null {
    if (!dob) return null;
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dobDate.getFullYear();
    const m = now.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) age--;
    return age;
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

  /**
   * WS3.5 PR4 — Notify the operator of a target that one of their stamps
   * has been disputed. Fires from disputeStamp() after the stamp row
   * moves to status='disputed'.
   *
   * Routing:
   *   - rink target → all users with an approved rink claim on the rink
   *     (one notification per operator, idempotent per (operator, stamp)).
   *   - venue/event target → all users with profiles.role='admin'
   *     (RinkStop staff; venue dispute access is staff-only per
   *     WS3.5 PR1 RLS — venues are admin-curated with no claims table
   *     for v1).
   *
   * Idempotency: source_key includes the recipient user id so the same
   * operator + same stamp = one notification (UNIQUE on
   * (user_id, source_key, kind)). Re-running disputeStamp for an
   * already-disputed stamp short-circuits before reaching this method
   * (status guard in disputeStamp), so we don't double-fire here either.
   *
   * Best-effort: a failure to insert any single recipient's notification
   * is logged but does not throw — the dispute itself succeeded.
   */
  private async notifyOperatorOnDispute(params: {
    stampId: string;
    targetType: StampTargetType;
    targetRinkId: string | null;
    targetVenueId: string | null;
    targetEventId: string | null;
    subjectUserId: string;
    reason: string | null;
  }): Promise<void> {
    // Resolve human-readable target name + recipient user ids.
    let targetName: string | null = null;
    let recipientIds: string[] = [];

    if (params.targetType === 'rink' && params.targetRinkId) {
      const { data: rink } = await supabaseAdmin
        .from('rinks')
        .select('name')
        .eq('id', params.targetRinkId)
        .maybeSingle();
      targetName = (rink?.name as string | null) ?? null;

      const { data: claims } = await supabaseAdmin
        .from('claims')
        .select('user_id')
        .eq('entity_id', params.targetRinkId)
        .eq('claim_type', 'rink')
        .eq('status', 'approved');
      recipientIds = (claims ?? [])
        .map((c) => c.user_id as string)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
    } else if (params.targetType === 'venue' || params.targetType === 'event') {
      // Venues/events: admin-curated, no public.claims. Route to all staff
      // (Clerk role='admin') — same authorization the WS3.5 PR1 RLS uses.
      if (params.targetType === 'venue' && params.targetVenueId) {
        const { data: venue } = await supabaseAdmin
          .from('venues')
          .select('name')
          .eq('id', params.targetVenueId)
          .maybeSingle();
        targetName = (venue?.name as string | null) ?? null;
      } else if (params.targetType === 'event' && params.targetEventId) {
        const { data: event } = await supabaseAdmin
          .from('venue_events')
          .select('name')
          .eq('id', params.targetEventId)
          .maybeSingle();
        targetName = (event?.name as string | null) ?? null;
      }

      const { data: staff } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');
      recipientIds = (staff ?? [])
        .map((p) => p.user_id as string)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
    }

    if (recipientIds.length === 0) {
      // No operator / staff to notify (rink without approved claim, or
      // venue/event with no admins). Quietly no-op; the dispute row is
      // still in the public scan_events audit trail and will surface in
      // any future operator-onboarding.
      return;
    }

    const reasonSuffix = params.reason ? ` Reason: \u201C${params.reason.slice(0, 200)}\u201D.` : '';
    const titles = {
      rink: 'A stamp at your rink was disputed',
      venue: 'A stamp at your venue was disputed',
      event: 'A stamp at your event was disputed',
    };
    const targetLabel = targetName ?? (params.targetType === 'rink' ? 'your rink' : params.targetType === 'venue' ? 'your venue' : 'your event');
    const body = `A holder disputed a stamp at ${targetLabel}.${reasonSuffix} Review the dispute queue to uphold or overturn.`;
    const title = titles[params.targetType];

    const rows = recipientIds.map((userId) => ({
      user_id: userId,
      kind: 'stamp_disputed' as const,
      source_key: `stamp:${params.stampId}:operator:${userId}`,
      title,
      body,
      metadata: {
        stamp_id: params.stampId,
        target_type: params.targetType,
        target_name: targetName,
        target_id:
          params.targetType === 'rink'
            ? params.targetRinkId
            : params.targetType === 'venue'
              ? params.targetVenueId
              : params.targetEventId,
        subject_user_id: params.subjectUserId,
        dispute_reason: params.reason,
        queue_url:
          params.targetType === 'rink'
            ? `/dashboard/manage/rink/${params.targetRinkId}/disputes`
            : '/admin/stamps/disputes',
      },
    }));

    const { error } = await supabaseAdmin
      .from('consumer_notifications')
      .insert(rows);

    // ON CONFLICT DO NOTHING via UNIQUE (user_id, source_key, kind).
    // Supabase returns 23505 on duplicate — treat as success.
    if (error && error.code !== '23505') {
      console.error(
        '[stamp-service] notifyOperatorOnDispute insert failed:',
        error
      );
    }
  }

  private async writeScanEvent(
    qrIdentifier: string,
    actorUserId: string | null,
    outcome: string,
    details: Record<string, unknown>,
    venueId?: string | null
  ): Promise<void> {
    const { error } = await supabaseAdmin.from('scan_events').insert({
      qr_identifier: qrIdentifier,
      actor_user_id: actorUserId,
      outcome,
      details,
      venue_id: venueId ?? null,
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
      .select('id, subject_user_id, actor_user_id, status, target_type, target_rink_id, target_venue_id, target_event_id')
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

    // WS3.5 PR4 — notify the operator of the target that they have a
    // dispute to review. Best-effort (a notification failure does not
    // roll back the dispute). For rink targets, notify every user with
    // an approved claim on the rink. For venue/event targets, venues
    // are admin-curated in WS3 v1 (no public.claims row), so the
    // WS3.5 PR1 RLS policy delegates venue/event dispute access to
    // staff only — we notify staff (Clerk role='admin') for those.
    try {
      await this.notifyOperatorOnDispute({
        stampId,
        targetType: stamp.target_type as StampTargetType,
        targetRinkId: (stamp.target_rink_id as string | null) ?? null,
        targetVenueId: (stamp.target_venue_id as string | null) ?? null,
        targetEventId: (stamp.target_event_id as string | null) ?? null,
        subjectUserId: callerUserId,
        reason: reason ?? null,
      });
    } catch (e) {
      console.error('[stamp-service] notifyOperatorOnDispute threw:', e);
    }

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

  /**
   * WS3.5 PR2 — List disputed stamps against a target, scoped to a caller
   * who is allowed to adjudicate them.
   *
   * Caller scope:
   *   - Operator with an approved claim on a rink target: passes callerUserId
   *     + rinkId as `targetId`. Authorization happens before the query (we
   *     accept the row only if claims has an approved row for that user+target).
   *   - RinkStop staff (Clerk role='admin'): passes callerUserId + staff=true
   *     flag. Bypasses the claim check; sees all disputed stamps at the target.
   *
   * Returns rows enriched with stamper display name (from profiles), target
   * context (rink/venue/event name + city + country), and the dispute reason
   * (pulled from the most recent scan_events row with outcome='flagged_dispute'
   * for that stamp).
   *
   * Pagination: simple limit/offset. Operator queues are small (single-digit
   * per day per target in v1); cursor pagination deferred to v2.
   *
   * Authorization check: throws StampForbiddenError if caller has no approved
   * claim on the rink target AND caller is not staff. The endpoint layer
   * catches this and returns 403.
   */
  async listDisputedStampsForOperator(params: {
    callerUserId: string;
    isStaff: boolean;
    targetType: 'rink' | 'venue' | 'event';
    targetId: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<DisputedStampRow>> {
    const { callerUserId, isStaff: legacyIsStaff, targetType, targetId } = params;
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    // WS4 Chunk 1 — when the V2 flag is on, recompute isStaff from the
    // resolver. When off, use the caller-supplied value (legacy path).
    const isStaff = await this.resolveEffectiveIsStaff(callerUserId, legacyIsStaff);

    // Authorization: rink targets require an approved claim. Venues/events
    // require staff. Throws StampForbiddenError if not authorized.
    if (targetType === 'rink') {
      if (isStaff) {
        // Staff bypasses the claim check.
      } else {
        const { data: claim, error: claimErr } = await supabaseAdmin
          .from('claims')
          .select('id, status')
          .eq('user_id', callerUserId)
          .eq('entity_id', targetId)
          .eq('claim_type', 'rink')
          .eq('status', 'approved')
          .maybeSingle();
        if (claimErr) {
          throw new Error(`Failed to verify operator claim: ${claimErr.message}`);
        }
        if (!claim) {
          throw new StampForbiddenError(
            'No approved claim on this rink; cannot view disputes'
          );
        }
      }
    } else {
      // venue / event are staff-only in v1 (venues admin-curated, events
      // belong to venues/rinks).
      if (!isStaff) {
        throw new StampForbiddenError(
          'Venue and event disputes are visible to RinkStop staff only'
        );
      }
    }

    // Query disputed stamps against the target.
    const targetColumn =
      targetType === 'rink'
        ? 'target_rink_id'
        : targetType === 'venue'
          ? 'target_venue_id'
          : 'target_event_id';

    const { data: stampRows, error: stampErr } = await supabaseAdmin
      .from('stamps')
      .select('*')
      .eq(targetColumn, targetId)
      .eq('status', 'disputed')
      .order('stamped_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (stampErr) {
      console.error('[stamp-service] listDisputedStampsForOperator failed:', stampErr);
      return [];
    }
    const rows = (stampRows ?? []).map(stampRowToRecord);
    if (rows.length === 0) return [];

    // Enrich with stamper display name from profiles (best-effort; null if
    // profile missing, anon stamper, or service-role can't read).
    const stamperIds = Array.from(
      new Set(
        rows
          .map((r) => r.subjectUserId ?? r.actorUserId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    let stamperLookup = new Map<string, { displayName: string | null; role: string | null }>();
    if (stamperIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from('profiles')
        .select('user_id, display_name, role')
        .in('user_id', stamperIds);
      stamperLookup = new Map(
        (profileRows ?? []).map((p) => [
          p.user_id as string,
          {
            displayName: (p.display_name as string | null) ?? null,
            role: (p.role as string | null) ?? null,
          },
        ])
      );
    }

    // Enrich with target context (rink/venue/event name + city + country).
    // Rink: city + country on rinks table. Venues: same on venues table.
    // Events: parent rink or venue name + city.
    let targetContext: {
      name: string;
      city: string | null;
      country: string | null;
    } | null = null;
    if (targetType === 'rink') {
      const { data: rink } = await supabaseAdmin
        .from('rinks')
        .select('name, city, country')
        .eq('id', targetId)
        .maybeSingle();
      if (rink) {
        targetContext = {
          name: rink.name as string,
          city: (rink.city as string | null) ?? null,
          country: (rink.country as string | null) ?? null,
        };
      }
    } else if (targetType === 'venue') {
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('name, city, country')
        .eq('id', targetId)
        .maybeSingle();
      if (venue) {
        targetContext = {
          name: venue.name as string,
          city: (venue.city as string | null) ?? null,
          country: (venue.country as string | null) ?? null,
        };
      }
    } else {
      // Events: derive city/country from parent rink or venue.
      const { data: event } = await supabaseAdmin
        .from('venue_events')
        .select('name, parent_rink_id, parent_venue_id')
        .eq('id', targetId)
        .maybeSingle();
      if (event) {
        if (event.parent_rink_id) {
          const { data: rink } = await supabaseAdmin
            .from('rinks')
            .select('name, city, country')
            .eq('id', event.parent_rink_id as string)
            .maybeSingle();
          if (rink) {
            targetContext = {
              name: (event.name as string) ?? (rink.name as string),
              city: (rink.city as string | null) ?? null,
              country: (rink.country as string | null) ?? null,
            };
          }
        } else if (event.parent_venue_id) {
          const { data: venue } = await supabaseAdmin
            .from('venues')
            .select('name, city, country')
            .eq('id', event.parent_venue_id as string)
            .maybeSingle();
          if (venue) {
            targetContext = {
              name: (event.name as string) ?? (venue.name as string),
              city: (venue.city as string | null) ?? null,
              country: (venue.country as string | null) ?? null,
            };
          }
        }
      }
    }

    // Pull dispute reason from the most-recent scan_events row for each stamp
    // with outcome='flagged_dispute'. Best-effort; null if not found or unreadable.
    const reasonByStamp = new Map<string, string | null>();
    for (const stamp of rows) {
      const { data: scanEvents } = await supabaseAdmin
        .from('scan_events')
        .select('details, created_at')
        .eq('outcome', 'flagged_dispute')
        .order('created_at', { ascending: false })
        .limit(20);
      // Filter to rows whose details.stamp_id matches this stamp (we can't
      // query jsonb directly without a key path; we filter in JS because
      // scan_events is low-volume).
      const matching = (scanEvents ?? []).find((se) => {
        const d = se.details as { stamp_id?: string } | null;
        return d?.stamp_id === stamp.id;
      });
      reasonByStamp.set(
        stamp.id,
        (matching?.details as { reason?: string } | null)?.reason ?? null
      );
    }

    return rows.map((r) => {
      const stamperId = r.subjectUserId ?? r.actorUserId;
      const stamper = stamperId ? stamperLookup.get(stamperId) : undefined;
      return {
        stampId: r.id,
        targetType,
        targetName: targetContext?.name ?? 'Unknown target',
        targetCity: targetContext?.city ?? null,
        targetCountry: targetContext?.country ?? null,
        stamperDisplayName: stamper?.displayName ?? null,
        stamperRole: r.actorType,
        stampedAt: r.stampedAt,
        disputeReason: reasonByStamp.get(r.id) ?? null,
        // Use stampedAt as a fallback for disputeFlaggedAt; service can't
        // always pinpoint exactly when the dispute was filed vs when the
        // original stamp was created. UI sorts by stampedAt.
        disputeFlaggedAt: r.stampedAt,
      };
    });
  }
  /**
   * WS3.5 PR3 — List ALL disputed stamps across every target type, for
   * the RinkStop staff dispute queue. Same authorization model as the
   * adjudicate endpoint (staff-only); the operator queue method above is
   * its target-scoped sibling.
   *
   * Returns rows spanning rinks/venues/events so staff can adjudicate
   * any dispute from a single system-wide view. Optional targetType
   * filter narrows the list to one target type. Each row carries the
   * target id and a targetDisplay + targetLocation string pair so the
   * UI can render mixed-target rows without extra roundtrips.
   */
  async listDisputedStampsForStaff(params: {
    isStaff: boolean;
    /**
     * WS4 Chunk 1 — the staff user's internal id. When the V2 flag is on
     * AND this is provided, the service recomputes isStaff from the
     * resolver. When absent or flag is off, uses the `isStaff` literal.
     */
    callerUserId?: string;
    targetType?: 'rink' | 'venue' | 'event';
    limit?: number;
    offset?: number;
  }): Promise<Array<StaffDisputedStampRow>> {
    const { isStaff: legacyIsStaff, callerUserId, targetType } = params;
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const offset = Math.max(params.offset ?? 0, 0);

    // WS4 Chunk 1 — re-resolve isStaff when the V2 flag is on AND we have
    // a caller userId. Otherwise use the literal. Today's behavior is
    // preserved when the flag is off.
    const isStaff = callerUserId
      ? await this.resolveEffectiveIsStaff(callerUserId, legacyIsStaff)
      : legacyIsStaff;

    if (!isStaff) {
      throw new StampForbiddenError(
        'System-wide dispute queue is staff-only'
      );
    }

    // Pull disputed stamps. When a targetType filter is set, scope to the
    // matching column; otherwise pull all disputed rows and let enrichment
    // derive the type from the per-row target_*_id columns.
    let query = supabaseAdmin
      .from('stamps')
      .select('*')
      .eq('status', 'disputed')
      .order('stamped_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetType === 'rink') {
      query = query.not('target_rink_id', 'is', null);
    } else if (targetType === 'venue') {
      query = query.not('target_venue_id', 'is', null);
    } else if (targetType === 'event') {
      query = query.not('target_event_id', 'is', null);
    }

    const { data: stampRows, error: stampErr } = await query;
    if (stampErr) {
      console.error('[stamp-service] listDisputedStampsForStaff failed:', stampErr);
      return [];
    }
    const rows = (stampRows ?? []).map(stampRowToRecord);
    if (rows.length === 0) return [];

    // Enrich with stamper display name from profiles (best-effort).
    const stamperIds = Array.from(
      new Set(
        rows
          .map((r) => r.subjectUserId ?? r.actorUserId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    let stamperLookup = new Map<string, { displayName: string | null }>();
    if (stamperIds.length > 0) {
      const { data: profileRows } = await supabaseAdmin
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', stamperIds);
      stamperLookup = new Map(
        (profileRows ?? []).map((p) => [
          p.user_id as string,
          { displayName: (p.display_name as string | null) ?? null },
        ])
      );
    }

    // Enrich with target context for each row in parallel. Three small
    // lookups by id; safe because stamps rows are capped at 500/page.
    const rinkIds = Array.from(
      new Set(rows.map((r) => r.targetRinkId).filter((id): id is string => typeof id === 'string' && id.length > 0))
    );
    const venueIds = Array.from(
      new Set(rows.map((r) => r.targetVenueId).filter((id): id is string => typeof id === 'string' && id.length > 0))
    );
    const eventIds = Array.from(
      new Set(rows.map((r) => r.targetEventId).filter((id): id is string => typeof id === 'string' && id.length > 0))
    );

    const rinkLookup = new Map<string, { name: string; city: string | null; country: string | null }>();
    if (rinkIds.length > 0) {
      const { data: rinks } = await supabaseAdmin
        .from('rinks')
        .select('id, name, city, country')
        .in('id', rinkIds);
      for (const r of rinks ?? []) {
        rinkLookup.set(r.id as string, {
          name: r.name as string,
          city: (r.city as string | null) ?? null,
          country: (r.country as string | null) ?? null,
        });
      }
    }

    const venueLookup = new Map<string, { name: string; city: string | null; country: string | null }>();
    if (venueIds.length > 0) {
      const { data: venues } = await supabaseAdmin
        .from('venues')
        .select('id, name, city, country')
        .in('id', venueIds);
      for (const v of venues ?? []) {
        venueLookup.set(v.id as string, {
          name: v.name as string,
          city: (v.city as string | null) ?? null,
          country: (v.country as string | null) ?? null,
        });
      }
    }

    const eventLookup = new Map<string, { name: string; city: string | null; country: string | null }>();
    if (eventIds.length > 0) {
      const { data: events } = await supabaseAdmin
        .from('venue_events')
        .select('id, name, parent_rink_id, parent_venue_id')
        .in('id', eventIds);
      // For events, derive city/country from the parent rink or venue.
      const parentRinkIds = Array.from(
        new Set(
          (events ?? [])
            .map((e) => e.parent_rink_id as string | null)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      );
      const parentVenueIds = Array.from(
        new Set(
          (events ?? [])
            .map((e) => e.parent_venue_id as string | null)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      );
      const parentRinkMap = new Map<string, { name: string; city: string | null; country: string | null }>();
      if (parentRinkIds.length > 0) {
        const { data: parents } = await supabaseAdmin
          .from('rinks')
          .select('id, name, city, country')
          .in('id', parentRinkIds);
        for (const p of parents ?? []) {
          parentRinkMap.set(p.id as string, {
            name: p.name as string,
            city: (p.city as string | null) ?? null,
            country: (p.country as string | null) ?? null,
          });
        }
      }
      const parentVenueMap = new Map<string, { name: string; city: string | null; country: string | null }>();
      if (parentVenueIds.length > 0) {
        const { data: parents } = await supabaseAdmin
          .from('venues')
          .select('id, name, city, country')
          .in('id', parentVenueIds);
        for (const p of parents ?? []) {
          parentVenueMap.set(p.id as string, {
            name: p.name as string,
            city: (p.city as string | null) ?? null,
            country: (p.country as string | null) ?? null,
          });
        }
      }
      for (const e of events ?? []) {
        const parent = e.parent_rink_id
          ? parentRinkMap.get(e.parent_rink_id as string)
          : e.parent_venue_id
            ? parentVenueMap.get(e.parent_venue_id as string)
            : undefined;
        eventLookup.set(e.id as string, {
          name: (e.name as string | null) ?? parent?.name ?? 'Unknown event',
          city: parent?.city ?? null,
          country: parent?.country ?? null,
        });
      }
    }

    // Pull dispute reason from scan_events (best-effort, batched).
    const reasonByStamp = new Map<string, string | null>();
    const { data: scanEvents } = await supabaseAdmin
      .from('scan_events')
      .select('details, created_at')
      .eq('outcome', 'flagged_dispute')
      .order('created_at', { ascending: false })
      .limit(200);
    const stampIdSet = new Set(rows.map((r) => r.id));
    for (const se of scanEvents ?? []) {
      const d = se.details as { stamp_id?: string; reason?: string } | null;
      if (d?.stamp_id && stampIdSet.has(d.stamp_id) && !reasonByStamp.has(d.stamp_id)) {
        reasonByStamp.set(d.stamp_id, d.reason ?? null);
      }
    }

    const formatLocation = (city: string | null, country: string | null): string | null => {
      if (city && country) return `${city}, ${country}`;
      return city ?? country ?? null;
    };

    return rows
      .map((r): StaffDisputedStampRow | null => {
        const rowTargetType: 'rink' | 'venue' | 'event' | null = r.targetRinkId
          ? 'rink'
          : r.targetVenueId
            ? 'venue'
            : r.targetEventId
              ? 'event'
              : null;
        if (!rowTargetType) return null;
        const targetId =
          rowTargetType === 'rink'
            ? (r.targetRinkId as string)
            : rowTargetType === 'venue'
              ? (r.targetVenueId as string)
              : (r.targetEventId as string);
        const targetInfo =
          rowTargetType === 'rink'
            ? rinkLookup.get(targetId)
            : rowTargetType === 'venue'
              ? venueLookup.get(targetId)
              : eventLookup.get(targetId);
        const stamperId = r.subjectUserId ?? r.actorUserId;
        const stamper = stamperId ? stamperLookup.get(stamperId) : undefined;
        return {
          stampId: r.id,
          targetType: rowTargetType,
          targetId,
          targetDisplay: targetInfo?.name ?? 'Unknown target',
          targetLocation: formatLocation(targetInfo?.city ?? null, targetInfo?.country ?? null),
          stamperDisplayName: stamper?.displayName ?? null,
          stamperRole: r.actorType,
          stampedAt: r.stampedAt,
          disputeReason: reasonByStamp.get(r.id) ?? null,
        };
      })
      .filter((row): row is StaffDisputedStampRow => row !== null);
  }

  /**
   * WS3.5 PR2 — Adjudicate a disputed stamp (uphold or overturn).
   *
   * Authorization: caller must be (a) the operator on the target rink via
   * an approved claim, OR (b) RinkStop staff (Clerk role='admin'). Venues and
   * events are staff-only in v1.
   *
   * Behavior:
   *   - action='uphold': status='disputed' → 'rejected'. Sets rejected_at,
   *     rejected_by_user_id, optional rejected_reason. Writes a scan_events
   *     row with outcome='dispute_upheld'. Notifies the stamper (or stamp
   *     subject if third-party scan) with kind='dispute_upheld'.
   *   - action='overturn': status='disputed' → 'confirmed'. No rejected_*
   *     fields set. Writes a scan_events row with outcome='dispute_overturned'.
   *     Notifies the stamper with kind='dispute_overturned'.
   *
   * Idempotent: re-adjudicating a stamp that's already in the target state
   * returns success with current state, no audit row, no notification.
   *
   * Out of scope: notifications are best-effort (a failure to insert a
   * notification does not roll back the adjudication). The stamp itself
   * succeeds independent of notification writer.
   *
   * Throws:
   *   - StampNotFoundError if stampId doesn't exist
   *   - StampForbiddenError if caller is not authorized (not operator, not staff)
   *   - Error if stamp is in an unexpected status (not 'disputed')
   */
  async adjudicateStamp(params: {
    callerUserId: string;
    isStaff: boolean;
    stampId: string;
    action: 'uphold' | 'overturn';
    reason?: string;
  }): Promise<{
    stampId: string;
    status: StampStatus;
    action: 'uphold' | 'overturn';
  }> {
    const { callerUserId, isStaff: legacyIsStaff, stampId, action } = params;
    const reason = params.reason?.slice(0, 1000) ?? null;

    // WS4 Chunk 1 — re-resolve isStaff when the V2 flag is on. Legacy
    // callers passing isStaff=false (rink operators) and isStaff=true
    // (staff) still work exactly as before when the flag is off.
    const isStaff = await this.resolveEffectiveIsStaff(callerUserId, legacyIsStaff);

    // Load stamp + its target columns.
    const { data: stamp, error: stampErr } = await supabaseAdmin
      .from('stamps')
      .select('*')
      .eq('id', stampId)
      .maybeSingle();

    if (stampErr) {
      throw new Error(`Failed to load stamp: ${stampErr.message}`);
    }
    if (!stamp) {
      throw new StampNotFoundError(stampId);
    }

    // Idempotency: if stamp is already in the target state, no-op.
    if (action === 'uphold' && stamp.status === 'rejected') {
      return { stampId, status: 'rejected', action };
    }
    if (action === 'overturn' && stamp.status === 'confirmed') {
      // Stamp was confirmed (probably after an overturn) but caller is
      // adjudicating again. Treat as no-op.
      const cur = stamp.status as StampStatus;
      return { stampId, status: cur, action };
    }

    // Must be 'disputed' to adjudicate anything else.
    if (stamp.status !== 'disputed') {
      throw new StampForbiddenError(
        `Cannot adjudicate stamp in status '${stamp.status}'; must be 'disputed'`
      );
    }

    // Authorization per target type.
    const targetType = stamp.target_type as StampTargetType;
    if (targetType === 'rink') {
      if (!isStaff) {
        const targetRinkId = stamp.target_rink_id as string;
        const { data: claim, error: claimErr } = await supabaseAdmin
          .from('claims')
          .select('id')
          .eq('user_id', callerUserId)
          .eq('entity_id', targetRinkId)
          .eq('claim_type', 'rink')
          .eq('status', 'approved')
          .maybeSingle();
        if (claimErr) {
          throw new Error(`Failed to verify operator claim: ${claimErr.message}`);
        }
        if (!claim) {
          throw new StampForbiddenError(
            'No approved claim on this rink; cannot adjudicate'
          );
        }
      }
    } else {
      // venue / event are staff-only.
      if (!isStaff) {
        throw new StampForbiddenError(
          'Venue and event disputes are adjudicated by RinkStop staff only'
        );
      }
    }

    // Apply the status change.
    const updatePayload: Record<string, unknown> = {};
    if (action === 'uphold') {
      updatePayload.status = 'rejected';
      updatePayload.rejected_at = new Date().toISOString();
      updatePayload.rejected_by_user_id = callerUserId;
      if (reason) {
        updatePayload.rejected_reason = reason;
      }
    } else {
      // overturn
      updatePayload.status = 'confirmed';
    }

    const { error: updateErr } = await supabaseAdmin
      .from('stamps')
      .update(updatePayload)
      .eq('id', stampId);

    if (updateErr) {
      throw new Error(`Failed to update stamp status: ${updateErr.message}`);
    }

    // Audit row.
    await this.writeAdjudicationScanEvent(stampId, callerUserId, action, reason);

    // Notifications (best-effort).
    const recipientId = (stamp.subject_user_id as string | null) ?? (stamp.actor_user_id as string);
    if (recipientId && recipientId !== callerUserId) {
      // Don't notify the adjudicator about their own action.
      const targetName = await this.resolveTargetName(stamp);
      if (action === 'uphold') {
        await this.notifyStamperOnAdjudication({
          recipientUserId: recipientId,
          kind: 'dispute_upheld',
          stampId,
          targetName,
        });
      } else {
        await this.notifyStamperOnAdjudication({
          recipientUserId: recipientId,
          kind: 'dispute_overturned',
          stampId,
          targetName,
        });
      }
    }

    return {
      stampId,
      status: action === 'uphold' ? 'rejected' : 'confirmed',
      action,
    };
  }

  /**
   * WS3.5 PR4 — Notification writer for adjudication outcomes. Same
   * pattern as notifyStampReceived (idempotent via UNIQUE
   * (user_id, source_key, kind)). PR2 shipped a placeholder version with
   * generic copy; PR4 ships the production templates with target
   * context and a link back to the dashboard.
   *
   * Best-effort: a failure to insert does not throw — the adjudication
   * itself succeeded. Logged for forensics.
   */
  private async notifyStamperOnAdjudication(params: {
    recipientUserId: string;
    kind: 'dispute_upheld' | 'dispute_overturned';
    stampId: string;
    targetName: string | null;
  }): Promise<void> {
    const targetLabel = params.targetName ?? 'the venue';
    const titles = {
      dispute_upheld: `Stamp at ${targetLabel} removed`,
      dispute_overturned: `Stamp at ${targetLabel} restored`,
    };
    const bodies = {
      dispute_upheld: `A stamp you received at ${targetLabel} was disputed and the dispute was upheld by the operator. The stamp no longer counts on your Passport.`,
      dispute_overturned: `A stamp you received at ${targetLabel} was disputed, but the operator overturned the dispute. The stamp counts on your Passport.`,
    };

    try {
      const { error } = await supabaseAdmin
        .from('consumer_notifications')
        .insert({
          user_id: params.recipientUserId,
          kind: params.kind,
          source_key: `stamp:${params.stampId}:adjudication`,
          title: titles[params.kind],
          body: bodies[params.kind],
          metadata: {
            stamp_id: params.stampId,
            kind: params.kind,
            target_name: params.targetName,
            dashboard_url: '/dashboard/passport',
          },
        });
      // ON CONFLICT DO NOTHING via UNIQUE constraint; 23505 = success.
      if (error && error.code !== '23505') {
        console.error(
          '[stamp-service] notifyStamperOnAdjudication insert failed:',
          error
        );
      }
    } catch (e) {
      console.error('[stamp-service] notifyStamperOnAdjudication threw:', e);
    }
  }

  /**
   * WS3.5 PR2 — Resolve the human-readable target name for a stamp (used
   * by notification writers and any consumer that needs to render
   * "Rink X" / "Venue Y" / "Event Z" for a stamp).
   */
  private async resolveTargetName(stamp: Record<string, unknown>): Promise<string | null> {
    if (stamp.target_rink_id) {
      const { data } = await supabaseAdmin
        .from('rinks')
        .select('name')
        .eq('id', stamp.target_rink_id as string)
        .maybeSingle();
      return (data?.name as string | null) ?? null;
    }
    if (stamp.target_venue_id) {
      const { data } = await supabaseAdmin
        .from('venues')
        .select('name')
        .eq('id', stamp.target_venue_id as string)
        .maybeSingle();
      return (data?.name as string | null) ?? null;
    }
    if (stamp.target_event_id) {
      const { data } = await supabaseAdmin
        .from('venue_events')
        .select('name')
        .eq('id', stamp.target_event_id as string)
        .maybeSingle();
      return (data?.name as string | null) ?? null;
    }
    return null;
  }

  /**
   * WS3.5 PR2 — Write an adjudication audit row to scan_events. Mirrors
   * the pattern of writeScanEventForDispute (resolve qr_identifier from
   * the target, then call writeScanEvent with the new outcome).
   */
  private async writeAdjudicationScanEvent(
    stampId: string,
    callerUserId: string,
    action: 'uphold' | 'overturn',
    reason: string | null
  ): Promise<void> {
    // Look up target to resolve qr_identifier and venue_id.
    const { data: stamp } = await supabaseAdmin
      .from('stamps')
      .select('target_rink_id, target_venue_id, target_event_id')
      .eq('id', stampId)
      .maybeSingle();

    if (!stamp) return;

    let qrIdentifier: string | null = null;
    let venueId: string | null = null;

    if (stamp.target_venue_id) {
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('public_id')
        .eq('id', stamp.target_venue_id)
        .maybeSingle();
      qrIdentifier = venue?.public_id ?? null;
      venueId = stamp.target_venue_id;
    } else if (stamp.target_event_id) {
      const { data: event } = await supabaseAdmin
        .from('venue_events')
        .select('public_id, parent_venue_id')
        .eq('id', stamp.target_event_id)
        .maybeSingle();
      qrIdentifier = event?.public_id ?? null;
      venueId = event?.parent_venue_id ?? null;
    } else if (stamp.target_rink_id) {
      const { data: rink } = await supabaseAdmin
        .from('rinks')
        .select('qr_identifier')
        .eq('id', stamp.target_rink_id)
        .maybeSingle();
      qrIdentifier = rink?.qr_identifier ?? null;
      // Best-effort: resolve venue via first venue_events row for this rink.
      const { data: ve } = await supabaseAdmin
        .from('venue_events')
        .select('parent_venue_id')
        .eq('parent_rink_id', stamp.target_rink_id)
        .maybeSingle();
      venueId = ve?.parent_venue_id ?? null;
    }

    if (!qrIdentifier) {
      // Stamp target has no qr_identifier. Degrade safely — skip the
      // scan event. The stamps.status UPDATE already happened.
      return;
    }

    await this.writeScanEvent(
      qrIdentifier,
      callerUserId,
      action === 'uphold' ? 'dispute_upheld' : 'dispute_overturned',
      {
        stamp_id: stampId,
        reason,
      },
      venueId
    );
  }

  private async writeScanEventForDispute(
    stampId: string,
    callerUserId: string,
    reason: string | null
  ): Promise<void> {
    // Look up the stamp's qr_identifier and venue_id so the audit row
    // references the identifier (for fraud analysis) and venue (for RLS).
    const { data: stamp } = await supabaseAdmin
      .from('stamps')
      .select('target_rink_id, target_venue_id, target_event_id')
      .eq('id', stampId)
      .maybeSingle();

    if (!stamp) return;

    let qrIdentifier: string | null = null;
    let venueId: string | null = null;

    if (stamp.target_venue_id) {
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('public_id')
        .eq('id', stamp.target_venue_id)
        .maybeSingle();
      qrIdentifier = venue?.public_id ?? null;
      venueId = stamp.target_venue_id; // direct FK
    } else if (stamp.target_event_id) {
      const { data: event } = await supabaseAdmin
        .from('venue_events')
        .select('public_id, parent_venue_id')
        .eq('id', stamp.target_event_id)
        .maybeSingle();
      qrIdentifier = event?.public_id ?? null;
      venueId = event?.parent_venue_id ?? null;
    } else if (stamp.target_rink_id) {
      const { data: rink } = await supabaseAdmin
        .from('rinks')
        .select('qr_identifier')
        .eq('id', stamp.target_rink_id)
        .maybeSingle();
      qrIdentifier = rink?.qr_identifier ?? null;
      // Best-effort: resolve venue via first venue_events row for this rink.
      const { data: ve } = await supabaseAdmin
        .from('venue_events')
        .select('parent_venue_id')
        .eq('parent_rink_id', stamp.target_rink_id)
        .maybeSingle();
      venueId = ve?.parent_venue_id ?? null;
    }

    if (!qrIdentifier) {
      // Stamp target has no qr_identifier (shouldn't happen for confirmed
      // stamps, but degrade safely).
      return;
    }

    await this.writeScanEvent(qrIdentifier, callerUserId, 'flagged_dispute', {
      stamp_id: stampId,
      reason,
    }, venueId);
  }

  /**
   * WS4 Chunk 1 — Resolve the effective `isStaff` for this caller.
   *
   * When STAMPS_PERMISSIONS_V2_ENABLED is off, returns the caller-supplied
   * `isStaff` unchanged (legacy behavior). When on, queries the
   * AuthorizationContext and returns its `isStaff` field, ignoring the
   * caller-supplied value.
   *
   * This makes chunk 1 strictly additive: when the flag is off, no
   * resolver query happens and behavior matches today bit-for-bit. When
   * the flag is on, the service uses the same staff-or-claim-gated
   * decision the legacy code inlined (since chunk 1 only resolves staff
   * + rink_operator; league/team/coach scopes stay empty until chunks 2/3).
   */
  private async resolveEffectiveIsStaff(
    callerUserId: string,
    legacyIsStaff: boolean
  ): Promise<boolean> {
    if (!isPermissionsV2Enabled()) {
      return legacyIsStaff;
    }
    const authz = await getAuthorizationContext(callerUserId);
    return authz.isStaff;
  }
}

export const stampService = new StampService();
