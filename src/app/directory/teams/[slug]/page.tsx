import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Team DEBUG · RinkStop',
  robots: { index: false, follow: false },
};

// DEBUG VERSION - shows what the page receives
export default async function PublicTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('slug, name, is_active')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  return (
    <main style={{padding: '40px', fontFamily: 'monospace'}}>
      <h1>TEAM DEBUG</h1>
      <pre style={{fontSize: '14px'}}>
{`slug received: ${JSON.stringify(slug)}
normalizedSlug: ${JSON.stringify(normalizedSlug)}
byteLength: ${slug ? slug.length : 0}
encoded: ${slug ? encodeURIComponent(slug) : ''}
fullUrl: https://rinkstop.com/directory/teams/${slug}

QUERY RESULT:
data: ${JSON.stringify(team, null, 2)}
error: ${error ? error.message : 'none'}
      `}
      </pre>
    </main>
  );
}
