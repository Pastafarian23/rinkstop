import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Fetch inquiries the claimant has received
  const { data: inquiries, error } = await supabaseAdmin
    .from('leads')
    .select('id, listing_type, listing_id, listing_name, submitter_name, email, submitter_phone, message, status, created_at, read_at')
    .eq('claimant_user_id', userId)
    .in('source', ['listing_inquiry_rink', 'listing_inquiry_team'])
    .order('created_at', { ascending: false })
    .limit(200);

  // Check the claimant's tier — the lead capture form is a Pro-tier promise,
  // so we encourage non-Pro claimants to upgrade.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  const claimantTier = profile?.tier || 'free';

  const list = inquiries || [];
  const unreadCount = list.filter((i: any) => !i.read_at).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem', letterSpacing: '0.05em',
            color: '#fff', margin: 0,
          }}>
            LEADS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Inquiries from people interested in your rinks and teams.
          </p>
        </div>
        {unreadCount > 0 && (
          <div style={{
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '0.4rem 0.85rem',
            borderRadius: 999,
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            {unreadCount} unread
          </div>
        )}
      </div>

      {claimantTier !== 'pro' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(200,16,46,0.12), rgba(255,184,28,0.08))',
          border: '1px solid rgba(200,16,46,0.3)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.25rem' }}>
              ⭐ Lead capture forms are a Pro perk
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0 }}>
              You&apos;re on the <TierBadge tier={claimantTier as any} size="sm" /> plan. Upgrade to Pro to put a contact form on your claimed listings.
            </p>
          </div>
          <Link
            href="/pricing"
            style={{
              background: '#C8102E',
              color: '#fff',
              padding: '0.65rem 1.1rem',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            UPGRADE TO PRO →
          </Link>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(200,16,46,0.12)',
          border: '1px solid rgba(200,16,46,0.4)',
          borderRadius: 8,
          padding: '1rem 1.25rem',
          color: '#FF6B7A',
          marginBottom: '1.5rem',
        }}>
          Failed to load leads. Please refresh the page.
        </div>
      )}

      {list.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
        }}>
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 0.5rem' }}>
            No leads yet
          </p>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            {claimantTier === 'pro'
              ? 'When someone contacts you through a listing, you\'ll see it here.'
              : 'Once you upgrade to Pro, the contact form on your listings will start collecting leads here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map((inq: any) => (
            <LeadCard key={inq.id} inquiry={inq} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeadCard({ inquiry }: { inquiry: any }) {
  const created = inquiry.created_at ? new Date(inquiry.created_at) : null;
  const isUnread = !inquiry.read_at;
  const listingHref = inquiry.listing_type === 'rink'
    ? `/directory/rinks/${inquiry.listing_id}`  // rink route accepts both slug and UUID; redirects UUID → canonical slug
    : inquiry.listing_type === 'team'
    ? `/directory/teams/${inquiry.listing_id}`
    : '#';

  return (
    <div
      style={{
        background: isUnread ? 'rgba(20,184,166,0.04)' : 'rgba(255,255,255,0.03)',
        border: isUnread ? '1px solid rgba(20,184,166,0.3)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
            }}>
              {inquiry.submitter_name}
            </span>
            {isUnread && (
              <span style={{
                background: '#14B8A6',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                NEW
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
            <a href={`mailto:${inquiry.email}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
              {inquiry.email}
            </a>
            {inquiry.submitter_phone && (
              <a href={`tel:${inquiry.submitter_phone}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                {inquiry.submitter_phone}
              </a>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
            {created ? created.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
          </p>
          {inquiry.listing_name && (
            <Link
              href={listingHref}
              style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                color: 'rgba(255,255,255,0.65)',
                fontSize: '0.8rem',
                textDecoration: 'none',
                padding: '0.2rem 0.5rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
              }}
            >
              {inquiry.listing_type === 'rink' ? '🏒' : inquiry.listing_type === 'team' ? '🛡️' : '🏆'} {inquiry.listing_name}
            </Link>
          )}
        </div>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: '0.875rem 1rem',
        color: 'rgba(255,255,255,0.85)',
        fontSize: '0.9rem',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {inquiry.message}
      </div>
    </div>
  );
}
