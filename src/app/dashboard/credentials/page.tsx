// src/app/dashboard/credentials/page.tsx
// Cross-persona credentials summary + management links.
//
// Lists ALL federation_registrations for the current user across all three
// personas (player / coach / referee) in one place. Users with multiple
// roles (player+coach+referee) see all their registrations here without
// having to visit each persona's dashboard.
//
// Each section shows: federation, registration number, status badge,
// verified_at timestamp. Status transitions (submit/withdraw) happen on the
// per-persona page — this page is read-only.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

type Status = 'draft' | 'pending' | 'approved' | 'rejected';

interface RegistrationRow {
  id: string;
  registration_number: string;
  submission_status: Status;
  rejection_reason: string | null;
  verified_at: string | null;
  expires_at: string | null;
  player_id: string | null;
  coach_id: string | null;
  referee_user_id: string | null;
  federation: { slug: string; name: string } | null;
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, { bg: string; color: string; label: string }> = {
    draft:    { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', label: 'Draft' },
    pending:  { bg: 'rgba(255,184,28,0.18)',  color: '#FFB81C',                label: 'Pending review' },
    approved: { bg: 'rgba(0,150,80,0.18)',    color: '#009650',                label: 'Verified' },
    rejected: { bg: 'rgba(200,16,46,0.18)',    color: '#FF6B7A',                label: 'Rejected' },
  };
  const s = styles[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.18rem 0.5rem',
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {s.label}
    </span>
  );
}

function personaLabel(r: RegistrationRow): { label: string; mgmtHref: string } {
  if (r.player_id) return { label: 'Player', mgmtHref: '/dashboard/passport/federation' };
  if (r.coach_id) return { label: 'Coach', mgmtHref: '/dashboard/coach/credentials' };
  if (r.referee_user_id) return { label: 'Referee', mgmtHref: '/dashboard/referee/credentials' };
  return { label: '—', mgmtHref: '/dashboard' };
}

export default async function MyCredentialsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/credentials');

  // Resolve player's id (if any) so we can find player-side registrations.
  // Coach + referee lookups are by user_id (Clerk id) directly.
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const queries: any[] = [
    supabaseAdmin
      .from('federation_registrations')
      .select('id, registration_number, submission_status, rejection_reason, verified_at, expires_at, player_id, coach_id, referee_user_id, federation:federations(slug, name)')
      .eq('referee_user_id', userId),
    supabaseAdmin
      .from('coach_profiles')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle(),
  ];

  const [refRes, coachRes] = await Promise.all(queries);
  const coachId = coachRes.data?.id;

  let allRows: any[] = refRes.data ?? [];
  if (player) {
    const { data: playerRegs } = await supabaseAdmin
      .from('federation_registrations')
      .select('id, registration_number, submission_status, rejection_reason, verified_at, expires_at, player_id, coach_id, referee_user_id, federation:federations(slug, name)')
      .eq('player_id', player.id);
    allRows = allRows.concat(playerRegs ?? []);
  }
  if (coachId) {
    const { data: coachRegs } = await supabaseAdmin
      .from('federation_registrations')
      .select('id, registration_number, submission_status, rejection_reason, verified_at, expires_at, player_id, coach_id, referee_user_id, federation:federations(slug, name)')
      .eq('coach_id', coachId);
    allRows = allRows.concat(coachRegs ?? []);
  }

  // Flatten federation array FK + dedupe by id
  const seen = new Set<string>();
  const rows: RegistrationRow[] = [];
  for (const raw of allRows) {
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    const fed = Array.isArray(raw.federation) && raw.federation.length > 0 ? raw.federation[0] : raw.federation;
    rows.push({ ...raw, federation: fed ?? null } as RegistrationRow);
  }

  // Sort: approved first, then pending, then rejected, then draft. Within each, newest-first.
  const order: Record<Status, number> = { approved: 0, pending: 1, rejected: 2, draft: 3 };
  rows.sort((a, b) => {
    const oa = order[a.submission_status];
    const ob = order[b.submission_status];
    if (oa !== ob) return oa - ob;
    return (b.verified_at ?? '').localeCompare(a.verified_at ?? '');
  });

  // Group by persona for sectioned display
  const playerRows = rows.filter((r) => r.player_id);
  const coachRows = rows.filter((r) => r.coach_id);
  const refereeRows = rows.filter((r) => r.referee_user_id);

  return (
    <main style={{ minHeight: '100vh', background: '#041E42', color: '#fff' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>My credentials</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          MY CREDENTIALS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          All federation-issued credentials across your roles (player, coach, referee). Add or edit
          credentials on the persona-specific pages below.
        </p>

        {rows.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '1.25rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
              No credentials on file. Add credentials for any of your roles:
            </p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: '#FFB81C' }}>
              {player && <li><Link href="/dashboard/passport/federation" style={{ color: '#FFB81C' }}>Player → USA Hockey / Hockey Canada</Link></li>}
              {coachId && <li><Link href="/dashboard/coach/credentials" style={{ color: '#FFB81C' }}>Coach → Coaching licenses</Link></li>}
              <li><Link href="/dashboard/referee/credentials" style={{ color: '#FFB81C' }}>Referee → Officiating credentials</Link></li>
            </ul>
          </div>
        ) : (
          <>
            <SummarySection title="Player credentials" rows={playerRows} />
            <SummarySection title="Coach credentials" rows={coachRows} />
            <SummarySection title="Referee credentials" rows={refereeRows} />
          </>
        )}
      </div>
    </main>
  );
}

function SummarySection({ title, rows }: { title: string; rows: RegistrationRow[] }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
        {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>None.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {rows.map((r) => {
            const { mgmtHref } = personaLabel(r);
            return (
              <Link
                key={r.id}
                href={mgmtHref}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: '#fff',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{r.federation?.name ?? r.federation?.slug ?? '—'}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {r.registration_number}
                    {r.expires_at && (
                      <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.4)' }}>
                        (expires {new Date(r.expires_at).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {r.submission_status === 'rejected' && r.rejection_reason && (
                    <div style={{ fontSize: '0.75rem', color: '#FF6B7A', marginTop: 4 }}>
                      Reason: {r.rejection_reason}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.submission_status} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>→</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
