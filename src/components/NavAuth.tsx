'use client';

import { Show, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { userButtonAppearance } from '@/lib/clerk-appearance';

/**
 * NavAuth — shows Sign In / Sign Up buttons when signed out,
 * and a Clerk UserButton (avatar + dropdown with sign-out) when signed in.
 *
 * The Clerk <UserButton> is the single profile icon for signed-in users on
 * desktop. On mobile, MobileProfileButton renders a separate profile icon in
 * the top bar (signed-in only); the UserButton does not appear on mobile.
 * The UserButton's userProfileUrl="/dashboard/profile" makes its "Manage
 * account" entry point to the dashboard profile page.
 *
 * Clerk v7+ uses <Show when="signed-in" | "signed-out"> instead of the
 * deprecated <SignedIn>/<SignedOut> components.
 */
export default function NavAuth() {
  return (
    <>
      <Show
        when="signed-out"
        fallback={
          <UserButton
            appearance={userButtonAppearance}
            userProfileUrl="/dashboard/profile"
          />
        }
      >
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 0.875rem',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#000',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(255,215,0,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          Sign Up Free
        </Link>
      </Show>
    </>
  );
}
