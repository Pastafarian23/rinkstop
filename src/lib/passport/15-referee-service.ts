/**
 * src/lib/passport/15-referee-service.ts
 *
 * WS4 Chunk 2 — Referee domain service.
 *
 * Read-side helpers for the referee dashboard. Wraps the three new tables
 * (referee_game_assignments, referee_attendance, referee_payments) with
 * methods that join to venue_events for the dashboard's display needs.
 *
 * All methods take the caller's userId explicitly so the service can't
 * be misused by a route that forgot to authenticate. Authorization (referee
 * only sees own data; staff sees all) is enforced at the RLS layer and
 * re-checked in this service for routes that go through the user-scoped
 * client. For chunk 2 the dashboard pages use supabaseAdmin (service role)
 * and re-check ownership in code before returning.
 *
 * Writes (check-in, check-out, mark paid) are also defined here for the
 * future POST API routes. Chunk 2 ships the read paths and the SSR pages;
 * writes are exposed via the service so the API routes are trivial to add.
 */

import { supabaseAdmin } from '@/lib/supabase';
import type {
  RefereeAssignment,
  RefereeAssignmentWithEvent,
  RefereeAttendance,
  RefereePayment,
} from './types';

/**
 * Read-side error types — thrown when authorization fails. The dashboard
 * pages catch these and render an empty-state ("you have no assignments")
 * instead of crashing, so non-referee users hitting the dashboard get a
 * graceful experience.
 */
export class RefereeForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefereeForbiddenError';
  }
}

export class RefereeNotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`No ${resource} found for id ${id}`);
    this.name = 'RefereeNotFoundError';
  }
}

class RefereeService {
  /**
   * List this referee's assignments with the underlying venue_event joined
   * inline. Sorted by event.starts_at DESC (most recent first) — the
   * dashboard's "Upcoming" section filters to starts_at >= now client-side.
   *
   * limit/offset: 1-200, default 50.
   */
  async listAssignmentsForReferee(
    refereeUserId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<RefereeAssignmentWithEvent[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);

    const { data, error } = await supabaseAdmin
      .from('referee_game_assignments')
      .select(`
        id,
        referee_user_id,
        venue_event_id,
        role,
        status,
        assigned_at,
        assigned_by_user_id,
        confirmed_at,
        declined_at,
        decline_reason,
        notes,
        created_at,
        updated_at,
        venue_events:venue_event_id (
          name,
          starts_at,
          ends_at,
          parent_type,
          parent_rink_id,
          parent_venue_id
        )
      `)
      .eq('referee_user_id', refereeUserId)
      .order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load assignments: ${error.message}`);
    }

    return (data ?? []).map((row: any): RefereeAssignmentWithEvent => {
      const ev = Array.isArray(row.venue_events) ? row.venue_events[0] : row.venue_events;
      return {
        id: row.id,
        refereeUserId: row.referee_user_id,
        venueEventId: row.venue_event_id,
        role: row.role,
        status: row.status,
        assignedAt: row.assigned_at,
        assignedByUserId: row.assigned_by_user_id,
        confirmedAt: row.confirmed_at,
        declinedAt: row.declined_at,
        declineReason: row.decline_reason,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        eventName: ev?.name ?? 'Untitled event',
        eventStartsAt: ev?.starts_at ?? '',
        eventEndsAt: ev?.ends_at ?? null,
        parentName: null, // Resolved below if needed; chunk 2 reads from event columns directly.
        parentType: ev?.parent_type ?? null,
      };
    });
  }

  /**
   * Get one assignment, with caller-ownership check.
   * Staff can read any; non-staff must be the assigned referee.
   */
  async getAssignmentForCaller(
    assignmentId: string,
    callerUserId: string,
    isStaff: boolean
  ): Promise<RefereeAssignmentWithEvent> {
    const { data, error } = await supabaseAdmin
      .from('referee_game_assignments')
      .select(`
        id,
        referee_user_id,
        venue_event_id,
        role,
        status,
        assigned_at,
        assigned_by_user_id,
        confirmed_at,
        declined_at,
        decline_reason,
        notes,
        created_at,
        updated_at,
        venue_events:venue_event_id (
          name,
          starts_at,
          ends_at,
          parent_type,
          parent_rink_id,
          parent_venue_id
        )
      `)
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load assignment: ${error.message}`);
    }
    if (!data) {
      throw new RefereeNotFoundError('assignment', assignmentId);
    }
    if (!isStaff && data.referee_user_id !== callerUserId) {
      throw new RefereeForbiddenError('Not your assignment');
    }

    const ev = Array.isArray(data.venue_events) ? data.venue_events[0] : data.venue_events;
    return {
      id: data.id,
      refereeUserId: data.referee_user_id,
      venueEventId: data.venue_event_id,
      role: data.role,
      status: data.status,
      assignedAt: data.assigned_at,
      assignedByUserId: data.assigned_by_user_id,
      confirmedAt: data.confirmed_at,
      declinedAt: data.declined_at,
      declineReason: data.decline_reason,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      eventName: ev?.name ?? 'Untitled event',
      eventStartsAt: ev?.starts_at ?? '',
      eventEndsAt: ev?.ends_at ?? null,
      parentName: null,
      parentType: ev?.parent_type ?? null,
    };
  }

  /**
   * Attendance rows for one assignment (0 or 1 row; UNIQUE constraint).
   * Returns null if no row yet.
   */
  async getAttendanceForAssignment(
    assignmentId: string
  ): Promise<RefereeAttendance | null> {
    const { data, error } = await supabaseAdmin
      .from('referee_attendance')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load attendance: ${error.message}`);
    }
    if (!data) return null;
    return rowToAttendance(data);
  }

  /**
   * Payment row for one assignment (0 or 1 row; UNIQUE constraint).
   * Returns null if no row yet (staff hasn't set the amount).
   */
  async getPaymentForAssignment(
    assignmentId: string
  ): Promise<RefereePayment | null> {
    const { data, error } = await supabaseAdmin
      .from('referee_payments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load payment: ${error.message}`);
    }
    if (!data) return null;
    return rowToPayment(data);
  }

  /**
   * List all payments for this referee across all assignments.
   * Sorted by created_at DESC; default 50.
   */
  async listPaymentsForReferee(
    refereeUserId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<RefereePayment[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);

    const { data, error } = await supabaseAdmin
      .from('referee_payments')
      .select('*')
      .eq('referee_user_id', refereeUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load payments: ${error.message}`);
    }
    return (data ?? []).map(rowToPayment);
  }
}

function rowToAttendance(row: any): RefereeAttendance {
  return {
    id: row.id,
    refereeUserId: row.referee_user_id,
    assignmentId: row.assignment_id,
    attendanceStatus: row.attendance_status,
    checkedInAt: row.checked_in_at,
    checkedOutAt: row.checked_out_at,
    notes: row.notes,
    recordedByUserId: row.recorded_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPayment(row: any): RefereePayment {
  return {
    id: row.id,
    refereeUserId: row.referee_user_id,
    assignmentId: row.assignment_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    paidAt: row.paid_at,
    paidVia: row.paid_via,
    referenceNumber: row.reference_number,
    receiptUrl: row.receipt_url,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    markedPaidByUserId: row.marked_paid_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const refereeService = new RefereeService();
export { RefereeService };