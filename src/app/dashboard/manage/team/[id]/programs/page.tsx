// src/app/dashboard/manage/team/[id]/programs/page.tsx
//
// WS38 - Organization Plus team-registration-management.
//
// Owner list page for the team's programs. Each row is a team_events row
// scoped to this team_workspaces.id.
//
// Server component, force-dynamic. Owner check is the same pattern as the
// main team dashboard page: an approved claim of claim_type='team' on this
// entity_id.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProgramRow {
  id: string;
  team_id: string;
  event_kind: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  rsvp_required: boolean;
  rsvp_deadline: string | null;
  max_attendees: number | null;
  cost_per_player: number | string | null;
  currency: string;
  rink_id: string | null;
  opposing_team: string | null;
  is_off_ice: boolean;
  location_note: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  scheduled: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  completed: { bg: 'rgba(16,185,129,0.15)', fg: '#86EFAC' },
  cancelled: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}

function formatMoney(value: number | string | null, currency: string): string {
  if (value === null || value === undefined) return 'Free';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n) || n === 0) return 'Free';
  return `${currency} ${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  try {
    const dt = new Date(iso);
    return dt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default async function ManageTeamProgramsPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Load the workspace + claim check.
  const [{ data: workspace, error: wsErr }, { count: claimCount }] = await Promise.all([
    supabaseAdmin.from('team_workspaces').select('id, name, slug, currency').eq('id', id).maybeSingle(),
    supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('claim_type', 'team')
      .eq('entity_id', id)
      .eq('status', 'approved'),
  ]);

  if (wsErr || !workspace) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Could not load team. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }
  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this team.
        </div>
        <Link href={`/dashboard/claims?entity=team&id=${id}`} style={{ color: '#14B8A6' }}>→ Go to claims</Link>
      </div>
    );
  }

  // Load all programs + a grouped count of yes-RSVPs per program.
  const { data: programs, error: pgErr } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, event_kind, title, starts_at, ends_at, status, rsvp_required, rsvp_deadline, max_attendees, cost_per_player, currency, rink_id, opposing_team, is_off_ice, location_note, created_at, updated_at')
    .eq('team_id', id)
    .order('starts_at', { ascending: false });

  if (pgErr) {
    console.error('[manage-team-programs] load failed', pgErr);
  }

  const rows = (programs || []) as ProgramRow[];

  // Single grouped query for yes-RSVPs across all programs (much cheaper
  // than per-row counts).
  const rsvpCounts: Record<string, number> = {};
  if (rows.length > 0) {
    const { data: rsvpRows } = await supabaseAdmin
      .from('team_rsvps')
      .select('event_id, response')
      .in('event_id', rows.map((r) => r.id))
      .eq('response', 'yes');
    for (const r of rsvpRows || []) {
      const k = (r as { event_id: string }).event_id;
      rsvpCounts[k] = (rsvpCounts[k] || 0) + 1;
    }
  }

  const upcomingCount = rows.filter((r) => new Date(r.starts_at).getTime() >= Date.now() && r.status === 'scheduled').length;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/team/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {workspace.name} dashboard
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Programs &amp; Registrations</h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Create practices, tryouts, and events for {workspace.name}. Manage RSVPs in one place.
          </p>
        </div>
        <Link
          href={`/dashboard/manage/team/${id}/programs/new`}
          style={{ display: 'inline-block', background: '#38BDF8', color: '#0F172A', padding: '0.625rem 1.125rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}
        >
          + Create Program
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#94A3B8', flexWrap: 'wrap' }}>
        <span style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
          {rows.length} total
        </span>
        <span style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
          {upcomingCount} upcoming
        </span>
        {rows.filter((r) => r.status === 'cancelled').length > 0 && (
          <span style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
            {rows.filter((r) => r.status === 'cancelled').length} cancelled
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.25rem' }}>
            No programs yet.
          </p>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.875rem' }}>
            Create your first practice, tryout, or event to start collecting RSVPs.
          </p>
          <Link
            href={`/dashboard/manage/team/${id}/programs/new`}
            style={{ display: 'inline-block', background: '#38BDF8', color: '#0F172A', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}
          >
            + Create your first program
          </Link>
        </div>
      ) : (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Starts</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>RSVPs</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Capacity</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const yesCount = rsvpCounts[p.id] || 0;
                const isFull = p.max_attendees !== null && yesCount >= p.max_attendees;
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={tdStyle}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>
                        {p.title}
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                        {p.event_kind}
                        {p.opposing_team ? ` · vs ${p.opposing_team}` : ''}
                        {p.rink_id ? ` · at rink` : (p.location_note ? ` · ${p.location_note}` : '')}
                        {!p.rsvp_required ? ' · no RSVP' : ''}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: '#cbd5e1' }}>{formatDate(p.starts_at)}</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>→ {formatDate(p.ends_at)}</div>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={p.status} />
                      {!p.rsvp_required && (
                        <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '0.25rem' }}>not collecting</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{yesCount}</div>
                      {isFull && (
                        <div style={{ color: '#FCA5A5', fontSize: '0.7rem', marginTop: '0.125rem' }}>full</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {p.max_attendees !== null ? (
                        <span style={{ color: '#cbd5e1' }}>{p.max_attendees}</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>∞</span>
                      )}
                      {p.max_attendees !== null && (
                        <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '0.125rem' }}>
                          {formatMoney(p.cost_per_player, p.currency)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/dashboard/manage/team/${id}/programs/${p.id}/rsvps`}
                          style={{ color: '#38BDF8', fontSize: '0.8rem', textDecoration: 'none', padding: '0.25rem 0.5rem', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 6 }}
                        >
                          RSVPs
                        </Link>
                        <Link
                          href={`/dashboard/manage/team/${id}/programs/${p.id}/edit`}
                          style={{ color: '#cbd5e1', fontSize: '0.8rem', textDecoration: 'none', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/dashboard/manage/team/${id}`} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to team dashboard
        </Link>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  color: '#94A3B8',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'top',
};