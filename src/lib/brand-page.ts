// Brand page data layer (server-side).
// Provides typed queries for the brand listing and detail pages.

import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type Brand = {
  id: string;
  slug: string;
  name: string;
  category: string;
  country_of_origin: string | null;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
};

export type BrandList = {
  brands: Brand[];
  byCategory: Record<string, Brand[]>;
  totalCount: number;
};

/**
 * Fetch all brands, optionally filtered by category.
 * Cached for the duration of a single request.
 */
export const getBrandList = cache(async (category?: string): Promise<BrandList> => {
  const supabase = sb();
  let q = supabase
    .from('brands')
    .select('id, slug, name, category, country_of_origin, description, website_url, logo_url')
    .order('name', { ascending: true });
  if (category && category !== 'all') {
    q = q.eq('category', category);
  }
  const { data, error } = await q;
  if (error) throw new Error(`brands list: ${error.message}`);

  // Also fetch total count for the "X brands" badge
  const { count } = await supabase
    .from('brands')
    .select('id', { count: 'exact', head: true });

  // Build per-category map (always full set so the pill counts are accurate)
  const allBrands = data || [];
  const byCategory: Record<string, Brand[]> = { all: allBrands };
  for (const b of allBrands) {
    if (!byCategory[b.category]) byCategory[b.category] = [];
    byCategory[b.category].push(b);
  }

  return {
    brands: allBrands,
    byCategory,
    totalCount: count || 0,
  };
});

/**
 * Resolve a brand by slug, with its associated teams (filtered by brand_id once the
 * column is added in Priority 5C).
 */
export const getBrandBySlug = cache(async (slug: string): Promise<{
  brand: Brand | null;
  teams: Array<{ id: string; name: string; city: string | null; country: string | null; slug: string | null }>;
} | null> => {
  const supabase = sb();
  const { data, error } = await supabase
    .from('brands')
    .select('id, slug, name, category, country_of_origin, description, website_url, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`brand by slug: ${error.message}`);
  if (!data) return null;

  // Try the new brand_id column on teams; fall back to no teams if column is missing
  // (the column is added in Priority 5C). Use raw fetch so a 42703 column error
  // doesn't break the page.
  let teams: any[] = [];
  try {
    const { data: t, error: terr } = await supabase
      .from('teams')
      .select('id, name, city, country, slug')
      .eq('brand_id', data.id)
      .order('name', { ascending: true });
    if (!terr) teams = t || [];
  } catch (e) {
    // brand_id column doesn't exist yet; teams stays empty
    teams = [];
  }

  return { brand: data as Brand, teams };
});

/** Slug ↔ brand id mapping for the [id] → [slug] redirect. */
export const getBrandSlugMap = cache(async (): Promise<Map<string, string>> => {
  const supabase = sb();
  const { data, error } = await supabase
    .from('brands')
    .select('id, slug');
  if (error) throw new Error(`brand slug map: ${error.message}`);
  const map = new Map<string, string>();
  (data || []).forEach((r: any) => map.set(r.id, r.slug));
  return map;
});
// touched Thu Jun 11 06:01:45 UTC 2026
