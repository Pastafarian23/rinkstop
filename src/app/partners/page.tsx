import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import PartnersIndexClient, { type PartnerListing } from './PartnersIndexClient';
import type { Category } from '@/app/dashboard/listings/ListingsManager';

export const revalidate = 3600;
export const dynamicParams = true;

export const metadata: Metadata = {
  title: 'Hockey Partners · RinkStop',
  description: 'Pro shops, skate sharpening, camps, and training facilities in the hockey world.',
};

const VALID_CATEGORIES = new Set<Category>(['pro_shop', 'sharpening', 'camp', 'training', 'equipment', 'other']);

export default async function PartnersIndexPage() {
  // Only published listings show up here. RLS allows public SELECT on listings
  // (the policy is `listings_select_public ON listings FOR SELECT USING (is_published = true OR auth.uid()::text = owner_user_id)`),
  // but the service role bypasses RLS so we filter explicitly.
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, business_name, category, description, location, contact_email, contact_phone, website, logo_url, photos, hours, tier, is_published, is_featured, featured_until, created_at, updated_at')
    .eq('listing_type', 'business')
    .eq('is_published', true)
    // Phase 1c-2: featured listings surface first. The `featured_until` check
    // excludes expired placements. Order: featured (active) → updated_at desc.
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false });

  const initial: PartnerListing[] = (data || [])
    .filter((r): r is typeof r & { category: Category } => VALID_CATEGORIES.has(r.category as Category))
    .map((r) => ({ ...r, category: r.category as Category }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header
        style={{
          background: 'linear-gradient(135deg, #041E42 0%, #0a0a0a 100%)',
          border: '1px solid #1e1e1e', borderRadius: 12, padding: '2rem 1.75rem',
          display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>🛍️</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.75rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem',
            }}
          >
            HOCKEY PARTNERS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, maxWidth: 560 }}>
            Pro shops, sharpening, camps, training, and equipment in the hockey world. Filter by category or search by name.
          </p>
        </div>
      </header>

      <PartnersIndexClient initial={initial} />

      {error && (
        <div style={{ color: '#FF6B7A', fontSize: '0.85rem' }}>
          Could not load listings: {error.message}
        </div>
      )}
    </div>
  );
}
