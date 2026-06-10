'use client';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

/**
 * Mobile-only profile button that lives in the nav bar, immediately
 * left of the hamburger. Renders nothing for signed-out users (no
 * dashboard to go to) or while Clerk is still loading.
 *
 * Shows the user's Clerk profile image when one is set, otherwise
 * falls back to a generic person icon.
 */
export default function MobileProfileButton() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded || !isSignedIn) return null;

  return (
    <Link
      href="/dashboard"
      className="mob-profile-icon"
      aria-label="Go to your dashboard"
    >
      {user?.imageUrl ? (
        <img
          src={user.imageUrl}
          alt={user.firstName ?? user.username ?? 'Your profile'}
          className="mob-profile-icon__img"
        />
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </Link>
  );
}
