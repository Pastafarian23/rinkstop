import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import ClaimsForm from './ClaimsForm';
import { getUserTier, getMaxClaimsForTier, getUserApprovedClaimCount } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  approved: { bg: 'rgba(20,184,166,0.12)', color: '#14B8A6', border: 'rgba(20,184,166,0.4)', label: 'Approved' },
  pending:  { bg: 'rgba(255,184,28,0.12)', color: '#FFB81C', border: 'rgba(255,184,28,0.4)', label: 'Pending review' },
  rejected: { bg: 'rgba(200,16,46,0.12)', color: '#FF6B7A', border: 'rgba(200,16,46,0.4)', label: 'Rejected' },
};

export default async function ClaimsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Tier + cap for the form
  const [tier, currentCount] = await Promise.all([
    getUserTier(userId),
    getUserApprovedClaimCount(userId),
  ]);
  const actualMax = getMaxClaimsForTier(tier);
  const maxForClient = actualMax === Infinity ? -1 : actualMax;

  // Existing claims for this user
  const { data: myClaims } = await supabaseAdmin
    .from('claims')
    .select('id, claim_type, entity_name, entity_id, status, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '2rem' }}>✅</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            CLAIMS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            Verify you own a rink, team, or player to manage it&rsquo;s directory entry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TierBadge tier={tier} size="xs" />
          {actualMax === Infinity ? (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Custom claims</span>
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {currentCount} / {actualMax} approved
            </span>
          )}
        </div>
      </div>

      {/* My existing claims */}
      <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
          MY CLAIMS
        </h2>
        {!myClaims || myClaims.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
            You haven&rsquo;t submitted any claims yet. Use the form below to request ownership of a rink, team, or player profile.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myClaims.map((c: { id: string; claim_type: string; entity_name: string; entity_id: string | null; status: string | null; created_at: string | null }) => {
              const st = STATUS_STYLES[c.status || 'pending'] || STATUS_STYLES.pending;
              const canManage = c.status === 'approved' && c.entity_id && c.claim_type !== 'player';
              const editHref = c.claim_type === 'rink' && c.entity_id
                ? `/dashboard/manage/rink/${c.entity_id}`
                : c.claim_type === 'team' && c.entity_id
                ? `/dashboard/manage/team/${c.entity_id}`
                : c.claim_type === 'league' && c.entity_id
                ? `/dashboard/manage/league/${c.entity_id}`
                : null;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                    background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8, flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '1.25rem' }}>
                    {c.claim_type === 'rink' ? '🏟️' : c.claim_type === 'team' ? '🏒' : c.claim_type === 'player' ? '⭐' : c.claim_type === 'league' ? '🏆' : '•'}
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>{c.entity_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {c.claim_type}{c.created_at ? ` · submitted ${new Date(c.created_at).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                      padding: '0.2rem 0.55rem', borderRadius: 999,
                      background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                    }}
                  >
                    {st.label}
                  </span>
                  {canManage && editHref && (
                    <Link
                      href={editHref}
                      style={{ background: '#14B8A6', color: '#0a0a0a', padding: '0.4rem 0.85rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Manage →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
          SUBMIT A NEW CLAIM
        </h2>
        <Suspense fallback={null}>
          <ClaimsForm
            tier={tier}
            maxClaims={maxForClient}
            currentCount={currentCount}
          />
        </Suspense>
      </section>
    </div>
  );
}
