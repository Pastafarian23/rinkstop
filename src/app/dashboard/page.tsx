import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

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
              Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

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