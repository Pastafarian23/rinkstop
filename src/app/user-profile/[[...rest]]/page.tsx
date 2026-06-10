import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userProfileAppearance } from '@/lib/clerk-appearance';

export default async function UserProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    // Anonymous visitors get bounced to /login. Without this, the page would
    // return 200 with the Clerk <UserProfile /> rendering nothing (silent error
    // in the Clerk portal) and was previously leaking the account-management
    // route to crawlers and unauthenticated users.
    redirect('/login?redirect_url=/user-profile');
  }

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
