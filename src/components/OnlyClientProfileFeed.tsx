'use client';

/**
 * Thin client-only wrapper used on the profile page.
 *
 * Purpose: isolate the client-side render path from the server-rendered
 * page shell so React can hydrate without pulling every imported client
 * component into the same bundle boundary. This is a narrow structural
 * fix for the hydration crash on /profile/arnel, not a behavior change.
 */

import ProfileFeed from '@/components/ProfileFeed';

export default function OnlyClientProfileFeed(props: React.ComponentProps<typeof ProfileFeed>) {
  return <ProfileFeed {...props} />;
}
