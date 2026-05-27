import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  // Fields managed by Clerk — redirect to Clerk for editing
  const clerkFields = [
    { label: 'First Name', value: firstName || '—' },
    { label: 'Last Name', value: lastName || '—' },
    { label: 'Email', value: email },
    { label: 'Avatar', value: avatarUrl ? 'Set via Clerk' : 'None' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #C8102E' }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2.25rem',
            }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
              {firstName} {lastName || 'Your Name'}
            </h2>
            <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>{email}</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '1.25rem' }}>
          <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 1rem' }}>
            ACCOUNT INFORMATION
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clerkFields.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #141414' }}>
                <span style={{ color: '#666', fontSize: '0.875rem' }}>{label}</span>
                <span style={{ color: '#ccc', fontSize: '0.875rem' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manage via Clerk */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem' }}>
          MANAGE YOUR ACCOUNT
        </h3>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
          To update your name, email, or avatar, you'll be redirected to Clerk's secure account portal.
        </p>
        <a
          href="https://dashboard.clerk.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: '#041E42',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          Open Clerk Dashboard →
        </a>
      </div>

      {/* Connected accounts */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem' }}>
          CONNECTED ACCOUNTS
        </h3>
        <p style={{ color: '#555', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
          Sign-in methods and connected social accounts appear here.
        </p>
        <a
          href="https://dashboard.clerk.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: 'transparent',
            color: '#38bdf8',
            padding: '0.5rem 0',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Manage connected accounts →
        </a>
      </div>

    </div>
  );
}