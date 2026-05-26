import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Welcome card */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: '2rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 12px rgba(4,30,66,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem',
            }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: '#041E42', margin: 0 }}>
              {firstName} {lastName}
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{email}</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: '1.5rem',
        boxShadow: '0 2px 12px rgba(4,30,66,0.06)',
      }}>
        <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.25rem', color: '#041E42', margin: '0 0 1rem' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { href: '/dashboard/profile', label: 'Edit Profile', icon: '👤', desc: 'Update your name, bio & avatar' },
            { href: '/dashboard/favorites', label: 'Saved Players', icon: '❤️', desc: 'View your favorited players' },
            { href: '/dashboard/claims', label: 'Claim a Profile', icon: '✅', desc: 'Request ownership of a listing' },
            { href: '/dashboard/support', label: 'Contact Support', icon: '💬', desc: 'Get help from our team' },
          ].map(({ href, label, icon, desc }) => (
            <a
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '1.25rem',
                borderRadius: 8,
                border: '1px solid #e8ecf0',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(4,30,66,0.1)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              <div style={{ fontWeight: 600, color: '#041E42', marginTop: '0.5rem' }}>{label}</div>
              <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.25rem' }}>{desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Founding Member upsell */}
      <div style={{
        background: 'linear-gradient(135deg, #041E42 0%, #0a3060 100%)',
        borderRadius: 12,
        padding: '1.5rem',
        marginTop: '1.5rem',
        border: '1px solid #C8102E',
      }}>
        <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.25rem', color: '#FFB81C', margin: '0 0 0.5rem' }}>
          ⚡ Unlock the Full RinkStop Experience
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          Upgrade to Founding Member and get verified status, priority support, and more.
        </p>
        <a
          href="/founders-club"
          style={{
            display: 'inline-block',
            background: '#C8102E',
            color: 'white',
            padding: '0.625rem 1.25rem',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          View Plans →
        </a>
      </div>
    </div>
  );
}
