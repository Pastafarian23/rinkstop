import { UserProfile } from '@clerk/nextjs';
import { userProfileAppearance } from '@/lib/clerk-appearance';

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
          appearance={userProfileAppearance}
        />
      </div>
    </div>
  );
}
