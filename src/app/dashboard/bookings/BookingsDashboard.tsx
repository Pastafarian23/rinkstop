import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bookings' };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#7DD3FC' },
  contacted: { label: 'Contacted', color: '#FFB81C' },
  quoted: { label: 'Quoted', color: '#A78BFA' },
  won: { label: 'Won', color: '#86EFAC' },
  lost: { label: 'Lost', color: '#888' },
  spam: { label: 'Spam', color: '#FF6B7A' },
};

export default async function BookingsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Pull the user's listings, then their public_booking_inquiries
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, business_name, listing_type')
    .eq('owner_user_id', userId);

  const listingIds = (listings || []).map((l) => l.id);
  if (listingIds.length === 0) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', color: 'rgba(255,255,255,0.7)' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', margin: '0 0 0.5rem' }}>Bookings</h1>
          <p style={{ margin: 0 }}>Create a business listing first to start receiving booking inquiries.</p>
        </div>
      </div>
    );
  }

  const { data: inquiries } = await supabaseAdmin
    .from('public_booking_inquiries')
    .select('id, contact_name, contact_email, team_or_org, requested_start, requested_end, status, created_at, requested_price_cents, notes, source, listing_id')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = inquiries || [];
  const counts = {
    new: rows.filter((r) => r.status === 'new').length,
    contacted: rows.filter((r) => r.status === 'contacted').length,
    quoted: rows.filter((r) => r.status === 'quoted').length,
    won: rows.filter((r) => r.status === 'won').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🏟️</span>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em', color: '#fff', margin: '0 0 0.25rem' }}>BOOKINGS</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
              Inquiries from your business listings. Respond quickly — most prospects expect a reply within 24 hours.
            </p>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <Stat label="New" value={counts.new} highlight />
          <Stat label="Contacted" value={counts.contacted} />
          <Stat label="Quoted" value={counts.quoted} />
          <Stat label="Won" value={counts.won} />
        </div>

        {rows.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>No booking inquiries yet. Once customers contact you through your listing, they appear here.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                <th style={{ textAlign: 'left', padding: '0.4rem 0' }}>Contact</th>
                <th style={{ textAlign: 'left' }}>Team / Org</th>
                <th style={{ textAlign: 'left' }}>Requested</th>
                <th style={{ textAlign: 'left' }}>Source</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'left' }}>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = STATUS_LABELS[r.status] || { label: r.status, color: '#888' };
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0', color: '#fff' }}>
                      <div style={{ fontWeight: 600 }}>{r.contact_name || '—'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{r.contact_email || ''}</div>
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.7)' }}>{r.team_or_org || '—'}</td>
                    <td style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {r.requested_start ? new Date(r.requested_start).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{r.source || '—'}</td>
                    <td>
                      <span style={{ color: status.color, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: 'rgba(13,17,23,0.4)', border: '1px dashed var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
        <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Coming next:</strong> Recurring slot templates, capacity limits + waitlist, Stripe payment at booking time, email/SMS reminders 24h before.
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ color: highlight ? '#86EFAC' : '#fff', fontSize: '1.6rem', fontWeight: 700, lineHeight: 1 }}>{value}</span>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}
