import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserTier, getMaxClaimsForTier, getUserApprovedClaimCount } from '@/lib/connections';
import ClaimsForm from './ClaimsForm';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Fetch tier + approved claim count server-side so the form can show
  // "X / N claims used" with an upgrade CTA at the cap.
  const [tier, currentCount] = await Promise.all([
    getUserTier(userId),
    getUserApprovedClaimCount(userId),
  ]);

  // The cap depends on the user's tier; we can't return Infinity across the
  // server/client boundary cleanly, so we pass the resolved cap as a number
  // (or the sentinel -1 for unlimited, used by Pro tier).
  const actualMax = getMaxClaimsForTier(tier);
  const maxForClient = actualMax === Infinity ? -1 : actualMax;

  return (
    <ClaimsForm
      tier={tier}
      maxClaims={maxForClient}
      currentCount={currentCount}
    />
  );
}
