/**
 * /dashboard/referee
 *
 * WS4 Chunk 2 — Referee dashboard overview.
 *
 * Renders:
 *   - Hero: account type badge + summary stats (upcoming count, total
 *     games worked, total earned this year)
 *   - Upcoming assignments: next 5 with role, event name, date, status
 *   - Recent attendance: last 3 attendance rows
 *   - Payment summary: total owed / total paid this year
 *
 * Auth: must be signed in. Soft-gated on REFEREE_TOOLS_ENABLED — when off,
 * renders a "feature coming soon" notice instead of the dashboard.
 * Real authorization (referee-only) is enforced via the resolver's
 * isReferee flag; non-referees see an empty-state explaining the feature
 * requires a referee account type.
 *
 * Reads only (chunk 2): all writes happen via API routes that aren't
 * shipped yet. The dashboard displays assignments + attendance +
 * payments; check-in/check-out UI is on the assignment detail page.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getAuthorizationContext,
  isRefereeToolsEnabled,
  refereeService,
} from '@/lib/passport';
import { getAccountTypeMeta } from '@/lib/accountTypeMeta';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Referee Dashboard' };

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default async function RefereeDashboardPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login?error=signin_required');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  const authz = await getAuthorizationContext(userId);
  const accountTypeMeta = getAccountTypeMeta('referee');

  // Feature flag gate.
  if (!isRefereeToolsEnabled()) {
    return (
      <main style={{ padding: '24px 16px', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0f172a' }}>
          Referee Tools
        </h1>
        <div style={{
          background: 'rgba(255,184,28,0.08)',
          border: '1px solid rgba(255,184,28,0.3)',
          color: '#92400e',
          padding: '1rem 1.25rem',
          borderRadius: 8,
        }}>
          Referee tools are not yet enabled. Set{' '}
          <code>REFEREE_TOOLS_ENABLED=true</code> on Vercel to turn this on.
        </div>
      </main>
    );
  }

  // Referee-only gate. If the user doesn't have a referee account type,
  // render an explanation rather than an empty dashboard — they may have
  // arrived via a bookmark or a shared link.
  if (!authz.isReferee) {
    return (
      <main style={{ padding: '24px 16px', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0f172a' }}>
          Referee Tools
        </h1>
        <div style={{
          background: 'rgba(96,165,250,0.08)',
          border: '1px solid rgba(96,165,250,0.3)',
          color: '#1e3a8a',
          padding: '1rem 1.25rem',
          borderRadius: 8,
          marginBottom: '1rem',
        }}>
          You're signed in, but your account doesn't have the{' '}
          <strong>Referee</strong> account type. To officiate games and track
          your assignments, set your account type to Referee in your profile
          settings.
        </div>
        <Link
          href="/dashboard/profile"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1rem',
            background: '#0f172a',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          Go to Profile Settings →
        </Link>
      </main>
    );
  }

  // Load data (best-effort; missing tables or empty DBs render empty state).
  let upcoming: Awaited<ReturnType<typeof refereeService.listAssignmentsForReferee>> = [];
  let payments: Awaited<ReturnType<typeof refereeService.listPaymentsForReferee>> = [];
  try {
    upcoming = await refereeService.listAssignmentsForReferee(userId, { limit: 50 });
    payments = await refereeService.listPaymentsForReferee(userId, { limit: 200 });
  } catch (e) {
    console.error('[referee dashboard] failed to load data:', e);
  }

  const now = Date.now();
  const upcomingFiltered = upcoming
    .filter((a) => new Date(a.eventStartsAt).getTime() >= now && a.status !== 'declined' && a.status !== 'cancelled')
    .slice(0, 5);

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalOwed = payments
    .filter((p) => p.status === 'owed' || p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <main style={{ padding: '24px 16px 64px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#0f172a' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.6rem',
            background: accountTypeMeta.bg,
            color: accountTypeMeta.color,
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            border: `1px solid ${accountTypeMeta.border}`,
          }}>
            {accountTypeMeta.emoji} {accountTypeMeta.label}
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Referee Dashboard
          </h1>
        </div>

        {/* Summary stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <StatTile label="Upcoming games" value={String(upcomingFiltered.length)} accent="#60A5FA" />
          <StatTile label="Total games worked" value={String(upcoming.length)} accent="#94A3B8" />
          <StatTile label="Total earned" value={`${payments[0]?.currency ?? 'PHP'} ${totalPaid.toFixed(2)}`} accent="#34D399" />
          <StatTile label="Outstanding" value={`${payments[0]?.currency ?? 'PHP'} ${totalOwed.toFixed(2)}`} accent={totalOwed > 0 ? '#F87171' : '#94A3B8'} />
        </div>

        {/* Upcoming assignments */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>
            Upcoming assignments
          </h2>
          {upcomingFiltered.length === 0 ? (
            <EmptyState text="No upcoming games. Once staff assigns you to an event, it'll show here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingFiltered.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/referee/games/${a.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: '#0f172a',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.eventName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {a.role.replace('_', ' ')} • {formatDate(a.eventStartsAt)}
                    </div>
                  </div>
                  <div style={{
                    alignSelf: 'center',
                    padding: '0.2rem 0.6rem',
                    background: statusBg(a.status),
                    color: statusColor(a.status),
                    borderRadius: 999,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {a.status}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <Link
              href="/dashboard/referee/games"
              style={{
                display: 'inline-block',
                marginTop: '0.75rem',
                color: '#0f172a',
                fontSize: '0.85rem',
                textDecoration: 'underline',
              }}
            >
              View all assignments →
            </Link>
          )}
        </section>

        {/* Payment link */}
        <section>
          <Link
            href="/dashboard/referee/payments"
            style={{
              display: 'block',
              padding: '1rem 1.25rem',
              background: '#0f172a',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 700 }}>Payment ledger →</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
              {payments.length} payment{payments.length === 1 ? '' : 's'} on record
            </div>
          </Link>
        </section>

        {/* Federation credentials link */}
        <section style={{ marginTop: '1rem' }}>
          <Link
            href="/dashboard/referee/credentials"
            style={{
              display: 'block',
              padding: '1rem 1.25rem',
              background: '#0f172a',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 700 }}>Federation credentials →</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
              Submit your officiating license numbers for admin verification
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: '1rem',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      background: '#f8fafc',
      border: '1px dashed #cbd5e1',
      borderRadius: 8,
      color: '#64748b',
      textAlign: 'center',
      fontSize: '0.9rem',
    }}>
      {text}
    </div>
  );
}

function statusBg(status: string): string {
  switch (status) {
    case 'confirmed': return 'rgba(52,211,153,0.12)';
    case 'assigned':  return 'rgba(255,184,28,0.12)';
    case 'completed': return 'rgba(96,165,250,0.12)';
    case 'declined':  return 'rgba(248,113,113,0.12)';
    case 'cancelled': return 'rgba(148,163,184,0.12)';
    default:          return 'rgba(148,163,184,0.12)';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'confirmed': return '#059669';
    case 'assigned':  return '#92400e';
    case 'completed': return '#1e40af';
    case 'declined':  return '#b91c1c';
    case 'cancelled': return '#475569';
    default:          return '#475569';
  }
}