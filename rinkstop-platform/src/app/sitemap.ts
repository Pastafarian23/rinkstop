import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

const baseUrl = 'https://rinkstop.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/directory`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/directory/teams`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/directory/rinks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/directory/leagues`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/directory/fixtures`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Fetch dynamic content from Supabase using admin client
  if (!supabaseAdmin) {
    return staticPages;
  }

  const [teamsResult, rinksResult, leaguesResult, postsResult] = await Promise.all([
    supabaseAdmin.from('teams').select('slug, updated_at').eq('is_active', true),
    supabaseAdmin.from('rinks').select('slug, updated_at').eq('is_active', true),
    supabaseAdmin.from('leagues').select('slug, updated_at').eq('is_active', true),
    supabaseAdmin.from('posts').select('slug, updated_at').eq('status', 'published'),
  ]);

  const teamUrls: MetadataRoute.Sitemap = (teamsResult.data || []).map(t => ({
    url: `${baseUrl}/directory/teams/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const rinkUrls: MetadataRoute.Sitemap = (rinksResult.data || []).map(r => ({
    url: `${baseUrl}/directory/rinks/${r.slug}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const leagueUrls: MetadataRoute.Sitemap = (leaguesResult.data || []).map(l => ({
    url: `${baseUrl}/directory/leagues/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const postUrls: MetadataRoute.Sitemap = (postsResult.data || []).map(p => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...teamUrls, ...rinkUrls, ...leagueUrls, ...postUrls];
}