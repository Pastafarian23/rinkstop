import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 1.5rem',
      background: '#f8fafc',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(4,30,66,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: '#041E42',
          padding: '1.5rem 2rem',
          borderBottom: '3px solid #C8102E',
        }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '1.5rem',
            color: 'white',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            Sign In to RinkStop
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.875rem',
            margin: '0.25rem 0 0',
          }}>
            Access your dashboard, saved players, and more.
          </p>
        </div>
        <div style={{ padding: '2rem' }}>
          <SignIn />
        </div>
      </div>
    </div>
  );
}
