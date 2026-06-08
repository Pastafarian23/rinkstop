import { UserProfile } from '@clerk/nextjs';

export default function UserProfilePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem 3rem',
    }}>
      <div style={{ maxWidth: 768, margin: '0 auto', width: '100%' }}>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.85rem',
            textDecoration: 'none',
            marginBottom: '1.25rem',
          }}
        >
          ← Back to Dashboard
        </a>
        <UserProfile
          routing="path"
          path="/user-profile"
          appearance={{
            elements: {
              rootBox: { width: '100%' },
              card: { background: '#0f0f0f', border: '1px solid #1e1e1e', boxShadow: 'none' },
              navbar: { background: '#0a0a0a', borderRight: '1px solid #1e1e1e' },
              navbarButton: { color: 'rgba(255,255,255,0.7)' },
              navbarButtonActive: { background: 'rgba(200,16,46,0.15)', color: '#C8102E' },
              navbarButtonActiveText: { color: '#C8102E' },
              pageScrollBox: { background: '#0f0f0f' },
              profileSectionTitleText: { color: '#FFB81C' },
              formButtonPrimary: { background: '#C8102E', '&:hover': { background: '#a30d24' } },
              formFieldInput: { background: '#141414', borderColor: '#1e1e1e', color: '#e2e8f0' },
              formFieldLabel: { color: 'rgba(255,255,255,0.7)' },
              identityPreview: { background: '#141414', borderColor: '#1e1e1e' },
              identityPreviewText: { color: '#e2e8f0' },
              identityPreviewEditButton: { color: '#C8102E' },
              headerTitle: { color: '#fff' },
              headerSubtitle: { color: 'rgba(255,255,255,0.5)' },
            },
          }}
        />
      </div>
    </div>
  );
}
