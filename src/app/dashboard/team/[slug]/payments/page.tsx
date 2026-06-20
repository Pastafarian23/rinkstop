import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function fmtMoney(n: number | string, currency: string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export default async function PaymentsListPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/login');
  const user = await currentUser();

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  // Fetch the team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) notFound();

  // Membership check (must be on roster)
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem' }}>
        <h1 style={{ color: '#C8102E' }}>Not a member</h1>
        <p>You aren&rsquo;t on this team&rsquo;s roster.</p>
        <Link href={`/dashboard/team/${normalizedSlug}`}>← Back to team</Link>
      </div>
    );
  }

  // Fetch payments + aggregate stats per payment
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select(`
      id, title, description, amount_per_player, currency,
      convenience_fee_pct, due_date, status, created_at,
      payment_records(status, amount_paid)
    `)
    .eq('team_id', team.id)
    .order('created_at', { ascending: false });

  const isAdmin = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'].includes(myMembership.role);

  return (
    <div style={{ maxWidth: 980, padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/dashboard/team/${normalizedSlug}`} style={{ fontSize: '0.85rem', color: '#041E42' }}>
          ← Back to {team.name}
        </Link>
        <h1 style={{ margin: '0.5rem 0 0.25rem', color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>
          Payments &amp; Documents
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
          Track who&rsquo;s paid, who hasn&rsquo;t, and which documents are still outstanding.
        </p>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href={`/dashboard/team/${normalizedSlug}/payments/new`}
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            + New payment event
          </Link>
        </div>
      )}

      {!payments || payments.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          No payments yet. {isAdmin ? 'Create one above to get started.' : 'Your coach will create payment events here.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {payments.map((p: any) => {
            const records = p.payment_records || [];
            const paidCount = records.filter((r: any) => r.status === 'paid').length;
            const unpaidCount = records.filter((r: any) => r.status === 'unpaid' || r.status === 'pending_verification').length;
            const totalCollected = records.reduce((sum: number, r: any) => sum + parseFloat(r.amount_paid || '0'), 0);
            const totalExpected = records.length * parseFloat(p.amount_per_player);
            const pct = records.length > 0 ? Math.round((paidCount / records.length) * 100) : 0;
            const dueDate = p.due_date ? new Date(p.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

            return (
              <Link
                key={p.id}
                href={`/dashboard/team/${normalizedSlug}/payments/${p.id}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '1.25rem 1.5rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#041E42' }}>
                      {p.title}
                    </h2>
                    {p.description && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#041E42' }}>
                      {fmtMoney(p.amount_per_player, p.currency)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>per player</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#1a1a1a', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span>✓ <strong>{paidCount}</strong> paid</span>
                  {unpaidCount > 0 && <span style={{ color: '#C8102E' }}>⚠ <strong>{unpaidCount}</strong> outstanding</span>}
                  {records.length > 0 && <span>{fmtMoney(totalCollected, p.currency)} of {fmtMoney(totalExpected, p.currency)}</span>}
                  {dueDate && <span>Due {dueDate}</span>}
                </div>

                {records.length > 0 && (
                  <div style={{ marginTop: '0.75rem', background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: pct === 100 ? '#22c55e' : '#041E42', height: '100%', width: `${pct}%`, transition: 'width 0.2s' }} />
                  </div>
                )}

                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  Status: {p.status} {parseFloat(p.convenience_fee_pct) > 0 && `· ${p.convenience_fee_pct}% RinkStop fee`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}