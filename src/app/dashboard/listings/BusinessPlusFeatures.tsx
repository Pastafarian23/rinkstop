// Business Plus features wrapper — picks the user's primary listing
// and renders PromotionsCard + AnalyticsCard for it.

import { supabaseAdmin } from '@/lib/supabase';
import PromotionsCard from '../business/PromotionsCard';
import AnalyticsCard from '../business/AnalyticsCard';

interface Props {
  userId: string;
  userTier: string;
}

export default async function BusinessPlusFeatures({ userId, userTier }: Props) {
  // Pick the most-recently-updated listing the user owns.
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, business_name')
    .eq('owner_user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!listings || listings.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Business Plus features for: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{listings[0].business_name}</strong>
      </div>
      <PromotionsCard listingId={listings[0].id} userTier={userTier} />
      <AnalyticsCard listingId={listings[0].id} userTier={userTier} />
    </div>
  );
}
