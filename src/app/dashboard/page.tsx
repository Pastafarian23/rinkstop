import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  // Profile completeness + tier
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bio, location, tier, is_founding_member, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  const completeness: { field: string; done: boolean; href: string; hint: string }[] = [
    { field: 'Display name', done: !!firstName, href: '/dashboard/profile', hint: 'Add your first and last name' },
    { field: 'Avatar', done: !!avatarUrl, href: '/dashboard/profile', hint: 'Upload a profile photo' },
    { field: 'Bio', done: !!profile?.bio, href: '/dashboard/profile', hint: 'Tell people who you are' },
    { field: 'Location', done: !!profile?.location, href: '/dashboard/profile', hint: 'Add your city so people nearby can find you' },
  ];
  const completenessPct = Math.round((completeness.filter(c => c.done).length / completeness.length) * 100);
  const firstMissing = completeness.find(c => !c.done);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const quickLinks = [
    { href: '/dashboard/profile', label: 'Edit Profile', icon: '👤', desc: 'Update your name, avatar & contact info' },
    { href: '/dashboard/reviews', label: 'My Reviews', icon: '⭐', desc: 'View and manage your submitted reviews' },
    { href: '/dashboard/favorites', label: 'Saved Items', icon: '❤️', desc: 'Players, teams and rinks you\'ve saved' },
    { href: '/dashboard/claims', label: 'Claim a Profile', icon: '✅', desc: 'Request ownership of a listing' },
    { href: '/dashboard/support', label: 'Help & Support', icon: '💬', desc: 'Get help or contact our team' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Welcome card */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #C8102E' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem',
              border: '3px solid #C8102E',
            }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
              Welcome back, {firstName || 'RinkStop Member'}
            </h2>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>{email}</p>
            <p style={{ color: '#555', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
              {memberSince ? `Member since ${memberSince}` : 'Welcome to RinkStop'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <TierBadge tier={profile?.tier || 'free'} size="xs" />
              {profile?.is_founding_member && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '0.1rem 0.5rem', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  textTransform: 'uppercase', borderRadius: 999,
                  background: 'rgba(255,184,28,0.12)', color: '#FFB81C',
                  border: '1px solid rgba(255,184,28,0.4)',
                }}>⭐ Founding</span>
              )}
              {profile?.tier === 'free' && (
                <Link href="/founding-member" style={{ fontSize: 11, color: '#FFB81C', textDecoration: 'none', fontWeight: 600 }}>
                  ✨ Upgrade →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile completeness */}
      {completenessPct < 100 && firstMissing && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,184,28,0.08) 0%, rgba(20,184,166,0.04) 100%)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Profile {completenessPct}% complete</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                {firstMissing.hint}
              </p>
              <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${completenessPct}%`, height: '100%', background: 'linear-gradient(90deg, #FFB81C, #14B8A6)' }} />
              </div>
            </div>
            <Link
              href={firstMissing.href}
              style={{
                padding: '0.5rem 1rem', background: '#FFB81C', color: '#0a0a0a',
                borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700,
              }}
            >
              Complete profile →
            </Link>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 1.25rem' }}>
          QUICK ACTIONS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {quickLinks.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '1.25rem',
                borderRadius: 8,
                border: '1px solid #1e1e1e',
                textDecoration: 'none',
                color: 'inherit',
                background: '#141414',
                transition: 'border-color 0.2s, transform 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#C8102E';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e1e1e';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              <div style={{ fontWeight: 600, color: '#fff', marginTop: '0.5rem', fontSize: '0.95rem' }}>{label}</div>
              <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.5 }}>{desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Founding Member upsell */}
      <div style={{
        background: 'linear-gradient(135deg, #041E42 0%, #0a2a52 100%)',
        borderRadius: 12,
        padding: '1.75rem',
        border: '1px solid #C8102E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <div>
          <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#FFB81C', letterSpacing: '0.04em', margin: '0 0 0.5rem' }}>
            ⚡ UNLOCK THE FULL RINKSTOP EXPERIENCE
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', margin: 0, maxWidth: 500 }}>
            Get verified status, priority support, and exclusive features. Become a Founding Member today.
          </p>
        </div>
        <Link
          href="/founding-member"
          style={{
            display: 'inline-block',
            background: '#C8102E',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          View Plans →
        </Link>
      </div>
    </div>
  );
}