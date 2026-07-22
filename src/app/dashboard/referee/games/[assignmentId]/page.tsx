/**
 * /dashboard/referee/games/[assignmentId]
 *
 * WS4 Chunk 2 — Single assignment detail.
 *
 * Shows:
 *   - Event metadata (name, date, parent rink/venue, role)
 *   - Assignment status + decline reason if declined
 *   - Attendance card (status, check-in/out timestamps; chunk 2 is read-only,
 *     future PR adds check-in/check-out UI)
 *   - Payment card (status, amount, paid_at if paid)
 *
 * Authorization: caller must be the assigned referee, OR staff. Service
 * layer enforces; non-matching callers get a 403 page.
 *
 * Referee-only + flag-gated, same as the parent /dashboard/referee.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getAuthorizationContext,
  isRefereeToolsEnabled,
  refereeService,
  RefereeNotFoundError,
  RefereeForbiddenError,
} from '@/lib/passport';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Assignment Detail' };

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect('/login?error=signin_required');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!isRefereeToolsEnabled()) {
    return (
      <main style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Assignment</h1>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#92400e', padding: '1rem', borderRadius: 8 }}>
          Referee tools are not yet enabled.
        </div>
      </main>
    );
  }

  const authz = await getAuthorizationContext(userId);
  // Either referee (own assignments) OR staff.
  if (!authz.isReferee && !authz.isStaff) {
    return (
      <main style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Assignment</h1>
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', color: '#1e3a8a', padding: '1rem', borderRadius: 8 }}>
          You need a Referee account type to view assignments.
        </div>
      </main>
    );
  }

  const { assignmentId } = await params;

  let assignment, attendance, payment;
  try {
    assignment = await refereeService.getAssignmentForCaller(
      assignmentId,
      userId,
      authz.isStaff
    );
    attendance = await refereeService.getAttendanceForAssignment(assignmentId);
    payment = await refereeService.getPaymentForAssignment(assignmentId);
  } catch (e) {
    if (e instanceof RefereeNotFoundError) {
      return (
        <main style={{ padding: '24px 16px' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Assignment not found</h1>
          <Link href="/dashboard/referee/games" style={{ color: '#0f172a' }}>
            ← Back to all assignments
          </Link>
        </main>
      );
    }
    if (e instanceof RefereeForbiddenError) {
      return (
        <main style={{ padding: '24px 16px' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Not your assignment</h1>
          <p style={{ color: '#64748b' }}>This assignment belongs to another referee.</p>
          <Link href="/dashboard/referee/games" style={{ color: '#0f172a' }}>
            ← Back to your assignments
          </Link>
        </main>
      );
    }
    console.error('[referee/games/[id]] failed:', e);
    return (
      <main style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error</h1>
        <p style={{ color: '#64748b' }}>Could not load assignment. Try refreshing.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '24px 16px 64px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#0f172a' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/dashboard/referee/games" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'underline' }}>
          ← All assignments
        </Link>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem 0' }}>
          {assignment.eventName}
        </h1>
        <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {assignment.role.replace('_', ' ')} • {formatDateTime(assignment.eventStartsAt)}
          {assignment.parentType && ` • ${assignment.parentType}`}
        </div>

        {/* Status pill */}
        <div style={{
          display: 'inline-block',
          padding: '0.3rem 0.75rem',
          background: '#f1f5f9',
          color: '#0f172a',
          borderRadius: 999,
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>
          {assignment.status}
        </div>

        {assignment.status === 'declined' && assignment.declineReason && (
          <div style={{ padding: '0.85rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#7f1d1d', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
            <strong>Decline reason:</strong> {assignment.declineReason}
          </div>
        )}

        {assignment.notes && (
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
            <strong>Notes:</strong> {assignment.notes}
          </div>
        )}

        {/* Attendance card */}
        <Card title="Attendance">
          {attendance ? (
            <>
              <Row label="Status" value={attendance.attendanceStatus} />
              <Row label="Checked in" value={formatDateTime(attendance.checkedInAt)} />
              <Row label="Checked out" value={formatDateTime(attendance.checkedOutAt)} />
              {attendance.notes && <Row label="Notes" value={attendance.notes} />}
              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                Check-in/check-out UI lands in a follow-up PR.
              </p>
            </>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              No attendance recorded yet.
            </p>
          )}
        </Card>

        {/* Payment card */}
        <Card title="Payment">
          {payment ? (
            <>
              <Row label="Amount" value={`${payment.currency} ${payment.amount.toFixed(2)}`} />
              <Row label="Status" value={payment.status} />
              <Row label="Paid at" value={formatDateTime(payment.paidAt)} />
              {payment.paidVia && <Row label="Paid via" value={payment.paidVia} />}
              {payment.referenceNumber && <Row label="Reference" value={payment.referenceNumber} />}
              {payment.notes && <Row label="Notes" value={payment.notes} />}
            </>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              No payment record yet. Staff will set the amount once the game is confirmed.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '1rem 1.25rem',
      marginBottom: '1rem',
    }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.9rem' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}