/**
 * src/lib/passport/03-repository.ts
 *
 * Database access layer for the Passport identity layer.
 *
 * All methods use the existing supabaseAdmin client (service role key).
 * RLS policies on the new tables allow service-role bypass.
 *
 * Per Rule 6 (Zero Data Mutation): this repository only writes to the
 * new Passport tables. It never modifies existing tables.
 *
 * Per Rule 9 (No Existing Foreign Keys Change): the only FKs in the new
 * tables reference existing tables (profiles.user_id, passports.passport_id).
 * No FKs from existing tables are added or modified.
 */

import { supabaseAdmin } from '@/lib/supabase';
import type {
  PassportRecord,
  PassportEvent,
  PassportLink,
  PassportQrRevocation,
  PassportStatus,
  VerificationLevel,
  PassportEntityType,
} from './types';

function rowToRecord(row: any): PassportRecord {
  return {
    passportId: row.passport_id,
    internalUserId: row.internal_user_id,
    status: row.status as PassportStatus,
    verificationLevel: row.verification_level as VerificationLevel,
    issuedAt: row.issued_at,
    activatedAt: row.activated_at,
    deactivatedAt: row.deactivated_at,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    qrIdentifier: row.qr_identifier,
  };
}

function rowToEvent(row: any): PassportEvent {
  return {
    id: row.id,
    passportId: row.passport_id,
    eventType: row.event_type,
    payload: row.payload ?? {},
    internalUserId: row.internal_user_id,
    createdAt: row.created_at,
  };
}

function rowToLink(row: any): PassportLink {
  return {
    id: row.id,
    passportId: row.passport_id,
    entityType: row.entity_type as PassportEntityType,
    entityId: row.entity_id,
    linkedAt: row.linked_at,
    linkedBy: row.linked_by,
  };
}

export class PassportRepository {
  /**
   * Find a Passport by its public ID.
   */
  async findByPassportId(passportId: string): Promise<PassportRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('passports')
      .select('*')
      .eq('passport_id', passportId)
      .maybeSingle();

    if (error) {
      // PGRST116 is "no rows found" — treat as null, not error.
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? rowToRecord(data) : null;
  }

  /**
   * Find a Passport by its Internal Identity Identifier.
   * Returns null if no Passport exists for this user.
   */
  async findByInternalUserId(internalUserId: string): Promise<PassportRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('passports')
      .select('*')
      .eq('internal_user_id', internalUserId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? rowToRecord(data) : null;
  }

  /**
   * Create a new Passport record. Throws if a Passport already exists
   * for this internal_user_id (unique constraint).
   */
  async create(input: {
    passportId: string;
    internalUserId: string;
    status?: PassportStatus;
    verificationLevel?: VerificationLevel;
    source?: string;
  }): Promise<PassportRecord> {
    const { data, error } = await supabaseAdmin
      .from('passports')
      .insert({
        passport_id: input.passportId,
        internal_user_id: input.internalUserId,
        status: input.status ?? 'pending',
        verification_level: input.verificationLevel ?? 'none',
        source: input.source ?? 'migration',
      })
      .select('*')
      .single();

    if (error) throw error;
    return rowToRecord(data);
  }

  /**
   * Update the status of a Passport. Returns the updated record.
   */
  async updateStatus(
    passportId: string,
    status: PassportStatus
  ): Promise<PassportRecord> {
    const update: Record<string, any> = { status };
    if (status === 'active') update.activated_at = new Date().toISOString();
    if (status === 'deactivated')
      update.deactivated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('passports')
      .update(update)
      .eq('passport_id', passportId)
      .select('*')
      .single();

    if (error) throw error;
    return rowToRecord(data);
  }

  /**
   * Update the verification level of a Passport.
   */
  async updateVerificationLevel(
    internalUserId: string,
    level: VerificationLevel
  ): Promise<PassportRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('passports')
      .update({ verification_level: level })
      .eq('internal_user_id', internalUserId)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? rowToRecord(data) : null;
  }

  /**
   * Append an event to the Passport event log.
   * Returns the inserted event.
   */
  async appendEvent(input: {
    passportId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    internalUserId: string;
  }): Promise<PassportEvent> {
    const { data, error } = await supabaseAdmin
      .from('passport_events')
      .insert({
        passport_id: input.passportId,
        event_type: input.eventType,
        payload: input.payload ?? {},
        internal_user_id: input.internalUserId,
      })
      .select('*')
      .single();

    if (error) throw error;
    return rowToEvent(data);
  }

  /**
   * Get all events for a Passport, ordered newest first.
   */
  async getEventsForPassport(passportId: string, limit = 100): Promise<PassportEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('passport_events')
      .select('*')
      .eq('passport_id', passportId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(rowToEvent);
  }

  /**
   * Add a link between a Passport and an entity.
   * Returns the inserted link, or null if the link already exists.
   */
  async addLink(input: {
    passportId: string;
    entityType: PassportEntityType;
    entityId: string;
    linkedBy: string;
  }): Promise<PassportLink | null> {
    const { data, error } = await supabaseAdmin
      .from('passport_links')
      .insert({
        passport_id: input.passportId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        linked_by: input.linkedBy,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      // 23505 is unique violation.
      if (error.code === '23505') return null;
      throw error;
    }
    return data ? rowToLink(data) : null;
  }

  /**
   * Get all links for a Passport.
   */
  async getLinksForPassport(passportId: string): Promise<PassportLink[]> {
    const { data, error } = await supabaseAdmin
      .from('passport_links')
      .select('*')
      .eq('passport_id', passportId);

    if (error) throw error;
    return (data ?? []).map(rowToLink);
  }

  /**
   * Count all Passports in the system.
   * Used by migration progress reporting.
   */
  async count(): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('passports')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Find a Passport by its opaque QR identifier (UUID).
   *
   * Used by the /qr/[qrIdentifier] public resolver (Step 1.7) and by the
   * QR-code generation path (Step 1.5) when validating an inbound scan.
   *
   * Returns null if no active Passport matches. Note: the partial unique index
   * `passports_qr_identifier_active_uidx` only enforces uniqueness on non-deactivated
   * rows, so a revoked-and-deactivated Passport may still hold the old qr_identifier —
   * query here naturally filters those out via deactivated status checks upstream.
   */
  async findByQrIdentifier(qrIdentifier: string): Promise<PassportRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('passports')
      .select('*')
      .eq('qr_identifier', qrIdentifier)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? rowToRecord(data) : null;
  }

  /**
   * Rotate a Passport's qr_identifier. Admin-only operation.
   *
   * Implementation: invokes the SECURITY DEFINER Postgres function
   * `regenerate_passport_qr_identifier(passport_id, reason, revoked_by)` defined
   * in migration 2026-07-16_passport_qr_identifier.sql.
   *
   * The function bypasses the immutability trigger via its SECURITY DEFINER
   * privileges and writes an audit row to `passport_qr_revocations`. Returns the
   * updated Passport (with the new qr_identifier).
   *
   * Errors:
   * - PassportNotFoundError-shaped: if no row matches (PG raises via the SECURITY
   *   DEFINER function with 'Passport % not found').
   */
  async regenerateQrIdentifier(
    passportId: string,
    reason: string,
    revokedBy: string
  ): Promise<PassportRecord> {
    const { data, error } = await supabaseAdmin.rpc(
      'regenerate_passport_qr_identifier',
      {
        p_passport_id: passportId,
        p_reason: reason,
        p_revoked_by: revokedBy,
      }
    );

    if (error) throw error;

    // The RPC returns the updated Passport row directly. Re-fetch via the standard
    // finder to get a typed PassportRecord rather than relying on rpc() result type.
    const fresh = await this.findByPassportId(passportId);
    if (!fresh) {
      throw new Error(
        `regenerateQrIdentifier succeeded but findByPassportId(${passportId}) returned null immediately after`
      );
    }
    return fresh;
  }

  /**
   * Get all revocation records for a Passport, newest first.
   * Used by the audit view in the PR2 Card UI.
   */
  async getRevocationsForPassport(passportId: string): Promise<PassportQrRevocation[]> {
    const { data, error } = await supabaseAdmin
      .from('passport_qr_revocations')
      .select('*')
      .eq('passport_id', passportId)
      .order('revoked_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      passportId: row.passport_id,
      oldQrIdentifier: row.old_qr_identifier,
      newQrIdentifier: row.new_qr_identifier,
      reason: row.reason,
      revokedBy: row.revoked_by,
      revokedAt: row.revoked_at,
    }));
  }
}

export const passportRepository = new PassportRepository();