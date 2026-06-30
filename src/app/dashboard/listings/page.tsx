import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import ListingsManager from './ListingsManager';

export const dynamic = 'force-dynamic';

export default async function ListingsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, is_founding_member')
    .eq('user_id', userId)
    .maybeSingle();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '2rem' }}>🛍️</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.5rem', letterSpacing: '0.05em', color: '#fff', margin: '0 0 0.25rem',
            }}
          >
            BUSINESS LISTINGS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            Hi {firstName || 'there'} ({email}). Listings you create here appear under your public profile and (once published) in the directory.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TierBadge tier={profile?.tier || 'free'} size="xs" />
          {profile?.is_founding_member && (
            <span
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                padding: '0.1rem 0.5rem', borderRadius: 999,
                background: 'rgba(255,184,28,0.12)', color: '#FFB81C',
                border: '1px solid rgba(255,184,28,0.4)',
              }}
            >⭐ Founding</span>
          )}
        </div>
      </div>

      <ListingsManager />
    </div>
  );
}
