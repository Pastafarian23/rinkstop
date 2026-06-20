import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function fmtMoney(n: number | string, currency: string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export default async function MyPaymentsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Fetch all payment records for this user across all teams
  const { data: records } = await supabaseAdmin
    .from('payment_records')
    .select(`
      id, amount_due, amount_paid, status, paid_at, paid_via, reference_number, due_date,
      payments(id, title, description, amount_per_player, currency, convenience_fee_pct, due_date, status, team_id)
    `)
    .eq('player_id', userId)
    .order('created_at', { ascending: false });

  // Fetch team names for context
  const teamIds = [...new Set((records || []).map(r => (r as any).payments?.team_id).filter(Boolean))];
  const { data: teams } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name')
    .in('id', teamIds);
  const teamMap = new Map((teams || []).map(t => [t.id, t]));

  const outstanding = (records || []).filter(r => r.status === 'unpaid' || r.status === 'pending_verification' || r.status === 'partial');
  const paid = (records || []).filter(r => r.status === 'paid');

  const totalOutstanding = outstanding.reduce((sum, r) => sum + parseFloat(String(r.amount_due)) - parseFloat(String(r.amount_paid || 0)), 0);
  const totalPaid = paid.reduce((sum, r) => sum + parseFloat(String(r.amount_paid || 0)), 0);

  return (
    <div style={{ maxWidth: 980, padding: '2rem 1.5rem' }}>
      <h1 style={{ margin: 0, color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>My payments</h1>
      <p style={{ margin: '0.25rem 0 1.5rem', color: '#6b7280' }}>Across all your teams.</p>

      <div style={{
        background: '#041E42',
        color: '#fff',
        borderRadius: 8,
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>Outstanding</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: totalOutstanding > 0 ? '#FFB81C' : '#fff' }}>
            {fmtMoney(totalOutstanding, 'PHP')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>Total paid</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{fmtMoney(totalPaid, 'PHP')}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>Records</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{(records || []).length}</div>
        </div>
      </div>

      {outstanding.length > 0 && (
        <>
          <h2 style={{ margin: '1.5rem 0 0.75rem', color: '#C8102E', fontSize: '1.125rem', fontWeight: 800 }}>⚠ Outstanding</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {outstanding.map((r: any) => {
              const team = teamMap.get(r.payments.team_id);
              const currency = r.payments.currency;
              const dueDate = r.payments.due_date ? new Date(r.payments.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : null;
              return (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #C8102E', borderRadius: 8, padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#041E42' }}>{r.payments.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{team?.name || 'Team'} {dueDate && `· Due ${dueDate}`}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#C8102E' }}>
                        {fmtMoney(parseFloat(String(r.amount_due)) - parseFloat(String(r.amount_paid || 0)), currency)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {r.status === 'pending_verification' ? 'pending verification' : 'unpaid'}
                      </div>
                    </div>
                  </div>
                  {team && (
                    <Link
                      href={`/dashboard/team/${team.slug}/payments/${r.payments.id}`}
                      style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.85rem', color: '#041E42', fontWeight: 700 }}
                    >
                      View / submit reference →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {paid.length > 0 && (
        <>
          <h2 style={{ margin: '1.5rem 0 0.75rem', color: '#041E42', fontSize: '1.125rem', fontWeight: 800 }}>Paid</h2>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 700 }}>Event</th>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 700 }}>Team</th>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 700 }}>Method</th>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 700 }}>Paid on</th>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((r: any) => {
                  const team = teamMap.get(r.payments.team_id);
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.625rem 0.875rem' }}>{r.payments.title}</td>
                      <td style={{ padding: '0.625rem 0.875rem', color: '#6b7280' }}>{team?.name || '—'}</td>
                      <td style={{ padding: '0.625rem 0.875rem', color: '#6b7280' }}>{r.paid_via || '—'}</td>
                      <td style={{ padding: '0.625rem 0.875rem', color: '#6b7280' }}>
                        {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                        {fmtMoney(r.amount_paid, r.payments.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(!records || records.length === 0) && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No payment records yet. Your coach will create payment events here.
        </div>
      )}
    </div>
  );
}