// src/app/dashboard/event-submissions/page.tsx
//
// Submitter: view your own event submissions.
// Signed-in users can see all their submissions and their current status.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  approved: { bg: 'rgba(74,222,128,0.15)', fg: '#86EFAC' },
  rejected: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
  spam: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  duplicate: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return '—'; }
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}

export default async function MyEventSubmissionsPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const userId = await resolveCanonicalUserId(session.userId, '');

  // Load this user's submissions via the raw_payload.submitter_user_id field
  // (since the submissions table doesn't have a FK index we can use directly).
  // Better: query by submitter_email as a fallback.
  // Cleanest: load user's email and filter.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();

  const email = profile?.email?.toLowerCase();
  if (!email) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>My Event Submissions</h1>
        <p>No email on file. Add one to see your submissions.</p>
      </div>
    );
  }

  const { data: submissions } = await supabaseAdmin
    .from('event_submissions')
    .select('*, rinks(name, slug, city)')
    .eq('submitter_email', email)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
        ← Back to dashboard
      </Link>
      <h1 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', color: 'var(--fg)' }}>My Event Submissions</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Events you've submitted for review. Status updates as rink owners review them.
      </p>

      {!submissions || submissions.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
          You haven't submitted any events yet.
          <div style={{ marginTop: '1rem' }}>
            <Link href="/events/submit" style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>Submit your first event →</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {submissions.map((s: any) => (
            <div key={s.id} style={{
              padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '1rem' }}>{s.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {s.rinks?.name || 'Rink not specified'}
                    {s.rinks?.city && ` · ${s.rinks.city}`}
                    · {formatDate(s.starts_at)}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
              {s.rejection_reason && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.5rem 0.75rem', borderRadius: 6, marginTop: '0.5rem' }}>
                  <strong>Response:</strong> {s.rejection_reason}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Submitted {formatDate(s.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
