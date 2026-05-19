import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import PlayerRelated from '@/components/PlayerRelated';
import NHLShopWidget from '@/components/NHLShopWidget';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data } = await supabase
      .from('players')
      .select('*, teams(name, slug)')
      .eq('id', id)
      .single();
    
    if (data) {
      return {
        title: `${data.first_name} ${data.last_name} | RinkStop`,
        description: `${data.first_name} ${data.last_name} — ${data.position?.replace('_', ' ') || 'Hockey player'} for ${data.teams?.name || 'team'}. View stats and profile on RinkStop.`,
        openGraph: {
          title: `${data.first_name} ${data.last_name} | RinkStop`,
          images: data.headshot_url ? [{ url: data.headshot_url, width: 200, height: 200 }] : [],
        },
      };
    }
  } catch { /* ignore */ }
  return { title: 'Player | RinkStop' };
}

export default async function PlayerDetail({ params }: Props) {
  const { id } = await params;

  // Fetch player
  const { data: player } = await supabase
    .from('players')
    .select('*, teams(name, slug, logo_url)')
    .eq('id', id)
    .single();

  // Fetch stats
  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', id)
    .order('season', { ascending: false });

  if (!player) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <Breadcrumbs links={[{ label: 'Players', href: '/directory/players' }]} />
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>Player not found</h1>
      </div>
    );
  }

  const POSITIONS: Record<string, string> = {
    goalie: 'Goalie', defenseman: 'Defenseman', left_wing: 'Left Wing',
    right_wing: 'Right Wing', center: 'Center', defense: 'Defense', forward: 'Forward'
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Players', item: 'https://rinkstop.com/directory/players' },
      { '@type': 'ListItem', position: 3, name: `${player.first_name} ${player.last_name}`, item: `https://rinkstop.com/directory/players/${player.id}` },
    ],
  };

  const playerSchema = {
    '@context': 'https://schema.org',
    '@type': 'SportsPerson',
    name: `${player.first_name} ${player.last_name}`,
    url: `https://rinkstop.com/directory/players/${player.id}`,
    jobTitle: player.position?.replace('_', ' '),
    nationality: player.nationality,
    image: player.headshot_url,
    memberOf: player.teams?.name ? { '@type': 'SportsTeam', name: player.teams.name } : undefined,
    height: player.height_cm ? `${player.height_cm} cm` : undefined,
    weight: player.weight_kg ? `${player.weight_kg} kg` : undefined,
  };

  const schemaScript = JSON.stringify([breadcrumbSchema, playerSchema]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaScript }}
      />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

        <Breadcrumbs links={[
          { label: 'Directory', href: '/directory' },
          { label: 'Players', href: '/directory/players' },
          { label: `${player.first_name} ${player.last_name}`, href: `/directory/players/${player.id}` },
        ]} />
        <Link href="/directory/players" style={{ color: '#00C2B2', fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>← Back to Players</Link>
        
        <div className="flex items-center gap-6 mb-6">
          {player.headshot_url ? (
            <img src={player.headshot_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-teal-500" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl border-2 border-slate-600">🏒</div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">{player.first_name} {player.last_name}</h1>
            <p className="text-teal-400 text-lg">#{player.jersey_number} · {POSITIONS[player.position] || player.position}</p>
            <p className="text-slate-400">{player.teams?.name}</p>
            {player.nationality && <p className="text-slate-500 text-sm">{player.nationality}</p>}
          </div>
        </div>

        <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8"></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {player.height_cm && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Height</p><p className="text-white font-bold">{player.height_cm}cm</p></div>}
          {player.weight_kg && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Weight</p><p className="text-white font-bold">{player.weight_kg}kg</p></div>}
          {player.shoots && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Shoots</p><p className="text-white font-bold capitalize">{player.shoots}</p></div>}
          {player.catches && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Catches</p><p className="text-white font-bold capitalize">{player.catches}</p></div>}
        </div>

        {/* Player Bio - NEW descriptive content for SEO */}
        <div className="mb-8 p-6 rounded-xl" style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>PLAYER PROFILE</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            {player.first_name} {player.last_name} is a {player.position?.replace('_', ' ') || 'hockey player'} 
            {player.teams?.name ? ` playing for ${player.teams.name}` : ''}.
            {player.nationality ? ` Representing ${player.nationality}.` : ''}
            {player.height_cm ? ` Standing at ${player.height_cm}cm.` : ''}
            {' '}Follow their career and view full stats on RinkStop.
          </p>
        </div>

        {/* Related: Current Team, Team Rink, Other Players */}
        <PlayerRelated
          teamId={player.team_id}
          teamName={player.teams?.name || ''}
          teamSlug={player.team_id}
          homeRinkId={player.teams?.home_rink_id}
          homeRinkName={undefined}
        />

        {/* NHL Shop Widget */}
        {player.teams?.name && (
          <NHLShopWidget
            teamName={player.teams.name}
            teamSlug={player.teams.slug || player.team_id}
            primaryColor="#C8102E"
            secondaryColor="#FFFFFF"
            logoUrl={player.teams.logo_url}
          />
        )}
      </div>
    </>
  );
}