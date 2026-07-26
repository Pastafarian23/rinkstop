// src/lib/certifications.ts
//
// Certification resolver for the federation registration system.
// Maps (federation_slug, persona) → certification_id so API routes
// can stamp the right cert on a federation_registrations row at draft
// creation time.
//
// Why this is needed: PR #60 seeded 9 certifications (3 USA Hockey +
// 3 Hockey Canada + 3 IIHF, one per category player/coach/referee).
// A federation_registrations row only knows the issuing federation
// (federation_id), not the specific cert. The category is determined
// by which API route submitted it: /api/passport/federation/* is
// always player, /api/coach/credentials/* is always coach,
// /api/referee/credentials/* is always referee.
//
// Resolution at draft time (PR3 design) — not at approval time —
// because the user knows what they're registering for when they
// enter the number, not when an admin approves later.
//
// Caching: we use Next.js's unstable_cache with a 1-hour TTL keyed
// on (federation_slug, category). The lookup is small (9 rows) but
// the API routes hit it on every submit.

import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

export type CertificationCategory = 'player' | 'coach' | 'referee' | 'staff';

/**
 * Resolve a certification_id from (federation_slug, category).
 * Returns null if no matching cert exists (e.g., IIHF 'staff' — not seeded).
 *
 * Used by the 3 submit/draft-creation routes. Single SQL lookup, cached
 * for 1h. The 9 certs are stable until the seed migration changes.
 */
export const resolveCertificationId = unstable_cache(
  async (federationSlug: string, category: CertificationCategory): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
      .from('certifications')
      .select('id, federations!inner(slug)')
      .eq('federations.slug', federationSlug)
      .eq('category', category)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      console.error('[resolveCertificationId] lookup failed', { federationSlug, category, error });
      return null;
    }
    return data?.id ?? null;
  },
  ['certification-resolver-v1'],
  { revalidate: 3600, tags: ['certifications'] }
);
