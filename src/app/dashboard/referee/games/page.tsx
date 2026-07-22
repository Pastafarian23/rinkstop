/**
 * /dashboard/referee/games
 *
 * WS4 Chunk 2 — Full list of the referee's assignments (vs the dashboard
 * overview which shows only the next 5 upcoming).
 *
 * Sort: most recently assigned first (assigned_at DESC).
 * Pagination: 50/page; offset via ?offset= query param.
 *
 * Auth: same as /dashboard/referee (signed in + referee account type).
 * Referee-only. Same flag gate as the overview.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getAuthorizationContext,
  isRefereeToolsEnabled,
  refereeService,
} from '@/lib/passport';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Game Assignments' };

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

export default async function RefereeGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect('/login?error=signin_required');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!isRefereeToolsEnabled()) {
    return (
      <main style={{ padding: '24px 16px', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Game Assignments</h1>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#92400e', padding: '1rem', borderRadius: 8 }}>
          Referee tools are not yet enabled.
        </div>
      </main>
    );
  }

  const authz = await getAuthorizationContext(userId);
  if (!authz.isReferee) {
    return (
      <main style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Game Assignments</h1>
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', color: '#1e3a8a', padding: '1rem', borderRadius: 8 }}>
          You need a Referee account type to view game assignments.
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const offset = Math.max(parseInt(sp.offset ?? '0', 10) || 0, 0);
  const limit = 50;

  let assignments: Awaited<ReturnType<typeof refereeService.listAssignmentsForReferee>> = [];
  try {
    assignments = await refereeService.listAssignmentsForReferee(userId, { limit, offset });
  } catch (e) {
    console.error('[referee/games] failed to load assignments:', e);
  }

  return (
    <main style={{ padding: '24px 16px 64px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#0f172a' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link href="/dashboard/referee" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'underline' }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Game Assignments
          </h1>
        </div>

        {assignments.length === 0 ? (
          <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>
            No assignments yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {assignments.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/referee/games/${a.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
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
                  padding: '0.2rem 0.6rem',
                  background: '#f1f5f9',
                  color: '#475569',
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

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.85rem' }}>
          {offset > 0 ? (
            <Link href={`/dashboard/referee/games?offset=${Math.max(0, offset - limit)}`} style={{ color: '#0f172a' }}>
              ← Previous
            </Link>
          ) : <span />}
          {assignments.length === limit && (
            <Link href={`/dashboard/referee/games?offset=${offset + limit}`} style={{ color: '#0f172a' }}>
              Next →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}