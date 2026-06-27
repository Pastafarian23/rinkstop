import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import { getUserTier } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const tier = await getUserTier(userId);

  // Personal track: Roster+/Pro/Business Pro/Business Premium/Enterprise have Family features
  // Business Starter does NOT have Family features (business focus)
  const canAccessFamily = ['roster_plus', 'pro', 'business_pro', 'business_premium', 'enterprise'].includes(tier);

  if (!canAccessFamily) {
    redirect('/pricing');
  }

  // Fetch managed profiles (kids linked to this user)
  const { data: managedProfiles } = await supabaseAdmin
    .from('managed_profiles')
    .select('id, profile_id, relationship, created_at, profiles:profiles!managed_profiles_profile_id_fkey(slug, display_name, avatar_url)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

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
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
            No players linked yet. Find youth hockey players in the directory and use "I&apos;m this player&apos;s parent" on their profile to link them here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {managedProfiles.map((mp: any) => (
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
                    {mp.profiles?.display_name || 'Unknown Player'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {mp.relationship || 'parent'}
                    {mp.profiles?.slug && (
                      <>
                        {' · '}
                        <Link href={`/profile/${mp.profiles.slug}`} style={{ color: '#14B8A6' }}>
                          /profile/{mp.profiles.slug}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          Photo and video upload for linked players coming soon. Roster+ members get 1GB storage, Pro members get 5GB.
        </p>
      </section>
    </div>
  );
}