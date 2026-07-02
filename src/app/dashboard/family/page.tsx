import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import { getUserTier } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import FamilySearch from '@/components/family/FamilySearch';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const tier = await getUserTier(userId);

  // Family Hub is part of the Identity Plus plan (and legacy pro/roster_plus).
  // The business track has its own equivalents (business_pro+ = paid business tier with multi-listing).
  // tierAtLeast handles both new and legacy tier names.
  const canAccessFamily =
    tierAtLeastSameTrack(tier, 'identity_plus') ||
    tierAtLeastSameTrack(tier, 'business_listing');
  if (!canAccessFamily) {
    redirect('/pricing');
  }

  // Fetch managed profiles (kids linked to this user)
  // Note: column is manager_user_id, profile_id links to players.id
  const { data: managedProfiles } = await supabaseAdmin
    .from('managed_profiles')
    .select('id, profile_id, relationship, created_at')
    .eq('manager_user_id', userId)
    .order('created_at', { ascending: false });

  // Hydrate player names for display
  const profileIds = (managedProfiles || []).map((mp: any) => mp.profile_id);
  const playerMap: Record<string, any> = {};
  if (profileIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug, headshot_url')
      .in('id', profileIds);
    for (const p of players || []) {
      playerMap[p.id] = p;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '2rem' }}>👨‍👩‍👧‍👦</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            FAMILY HUB
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            Link youth players to track their performance and access family features.
          </p>
        </div>
        <TierBadge tier={tier} size="xs" />
      </div>

      <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
          LINKED PLAYERS
        </h2>
        
        {!managedProfiles || managedProfiles.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            No players linked yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {managedProfiles.map((mp: any) => {
              const player = playerMap[mp.profile_id] || {};
              return (
              <div
                key={mp.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                  background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
                }}
              >
                <div style={{ fontSize: '1.25rem' }}>⭐</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                    {player.first_name && player.last_name ? `${player.first_name} ${player.last_name}` : 'Unknown Player'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {mp.relationship || 'parent'}
                    {player.slug && (
                      <>
                        {' · '}
                        <Link href={`/directory/players/${player.slug}`} style={{ color: '#14B8A6' }}>
                          /directory/players/{player.slug}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}

        <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading search…</div>}>
          <FamilySearch />
        </Suspense>
      </section>

      <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
          PERFORMANCE TRACKING
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
          Performance tracking features coming soon. Link players above to prepare for upcoming season stats and analytics.
        </p>
      </section>

      <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
          PHOTOS &amp; VIDEOS
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
          Photo and video upload for linked players coming soon. Identity Plus members get unlimited storage.
        </p>
      </section>
    </div>
  );
}