'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import HighlightsGrid from '@/components/HighlightsGrid';
import SaveButton from '@/components/SaveButton';
import { ClaimedBy } from '@/components/ClaimedBy';
import ClaimParentButton from '@/components/ClaimParentButton';
import { playerPageDecision, robotsMeta } from '@/lib/seo';

const BASE_URL = 'https://rinkstop.com';

const COUNTRY_NAMES: Record<string, string> = {
  CAN: 'Canada', USA: 'United States', US: 'United States',
  RUS: 'Russia', SWE: 'Sweden', FIN: 'Finland', CZE: 'Czechia',
  SVK: 'Slovakia', DEU: 'Germany', GER: 'Germany', CHE: 'Switzerland',
  NOR: 'Norway', DNK: 'Denmark', FRA: 'France', AUT: 'Austria',
  GBR: 'United Kingdom', LAT: 'Latvia', BLR: 'Belarus', SVN: 'Slovenia',
  ITA: 'Italy', NLD: 'Netherlands', AUS: 'Australia', JPN: 'Japan',
  KOR: 'South Korea', CHN: 'China', KAZ: 'Kazakhstan', UKR: 'Ukraine',
  POL: 'Poland', HUN: 'Hungary', EST: 'Estonia', LTU: 'Lithuania',
};

// NHL team → home city (for "home arena" lookup against the rinks table)
const NHL_TEAM_CITY: Record<string, string> = {
  ANA: 'Anaheim', ARI: 'Tempe', BOS: 'Boston', BUF: 'Buffalo',
  CAR: 'Raleigh', CBJ: 'Columbus', CGY: 'Calgary', CHI: 'Chicago',
  COL: 'Denver', DAL: 'Dallas', DET: 'Detroit', EDM: 'Edmonton',
  FLA: 'Sunrise', LAK: 'Los Angeles', MIN: 'Saint Paul', MTL: 'Montreal',
  NJD: 'Newark', NSH: 'Nashville', NYI: 'Elmont', NYR: 'New York',
  OTT: 'Ottawa', PHI: 'Philadelphia', PIT: 'Pittsburgh', SJS: 'San Jose',
  SEA: 'Seattle', STL: 'Saint Louis', TBL: 'Tampa', TOR: 'Toronto',
  UTA: 'Salt Lake City', VAN: 'Vancouver', VGK: 'Las Vegas',
  WPG: 'Winnipeg', WSH: 'Washington',
};

function buildPlayerBio(p: {
  first_name?: string; last_name?: string; position?: string; jersey_number?: number | string;
  nationality?: string; birth_place?: string; birth_date?: string;
  height_cm?: number; weight_kg?: number; shoots?: string; current_team_name?: string;
  teams?: { name?: string; leagues?: { name?: string } };
  career_stats?: any[];
}): string {
  const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const team = p.teams?.name || p.current_team_name;
  const league = p.teams?.leagues?.name;
  const pos = positionLabel(p.position);
  const parts: string[] = [];

  parts.push(`${fullName} is a professional ice hockey ${pos.toLowerCase()} who plays for the ${team}${league ? ` in the ${league}` : ''}.`);

  const personal: string[] = [];
  if (p.jersey_number != null) personal.push(`wears jersey #${p.jersey_number}`);
  if (p.height_cm) {
    const ft = Math.floor(p.height_cm / 30.48);
    const inches = Math.round((p.height_cm / 2.54) - ft * 12);
    personal.push(`stands ${ft}'${inches}" (${p.height_cm} cm) tall`);
  }
  if (p.weight_kg) personal.push(`weighs ${Math.round(p.weight_kg * 2.2046)} lbs (${p.weight_kg} kg)`);
  if (p.shoots) personal.push(`shoots ${p.shoots === 'L' ? 'left' : p.shoots === 'R' ? 'right' : p.shoots.toLowerCase()}`);
  if (personal.length > 0) parts.push(`On the ice, ${fullName} ${personal.join(', ')}.`);
  else parts.push(`${fullName} takes the ice for the ${team}.`);

  if (p.birth_place || p.nationality) {
    const countryName = p.nationality && p.nationality.length <= 3 ? COUNTRY_NAMES[p.nationality] || p.nationality : p.nationality;
    if (p.birth_place && countryName) parts.push(`${fullName} was born in ${p.birth_place}, ${countryName}.`);
    else if (p.birth_place) parts.push(`${fullName} was born in ${p.birth_place}.`);
    else if (countryName) parts.push(`${fullName} represents ${countryName} on the international stage.`);
  }

  if (p.birth_date) {
    const age = (() => {
      const birth = new Date(p.birth_date);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      return a;
    })();
    if (age > 0 && age < 100) parts.push(`At ${age} years old, ${fullName} is in the ${age < 25 ? 'early' : age < 30 ? 'prime' : 'experienced'} phase of a hockey career.`);
  }

  if (p.career_stats && p.career_stats.length > 0) {
    const isGoalie = p.position === 'goalie';
    let totalGP = 0;
    let totalG = 0, totalA = 0, totalPts = 0;
    let totalW = 0, totalSO = 0;
    p.career_stats.forEach((s: any) => {
      totalGP += s.games_played || 0;
      if (isGoalie) {
        totalW += s.wins || 0;
        totalSO += s.shutouts || 0;
      } else {
        totalG += s.goals || 0;
        totalA += s.assists || 0;
        totalPts += s.points || 0;
      }
    });
    if (totalGP > 0) {
      if (isGoalie) parts.push(`Across ${p.career_stats.length} season${p.career_stats.length === 1 ? '' : 's'} in the ${league || 'pros'}, ${fullName} has played ${totalGP} game${totalGP === 1 ? '' : 's'}, posted ${totalW} win${totalW === 1 ? '' : 's'}, and recorded ${totalSO} shutout${totalSO === 1 ? '' : 's'}.`);
      else parts.push(`Across ${p.career_stats.length} season${p.career_stats.length === 1 ? '' : 's'} in the ${league || 'pros'}, ${fullName} has played ${totalGP} game${totalGP === 1 ? '' : 's'} and produced ${totalG} goal${totalG === 1 ? '' : 's'}, ${totalA} assist${totalA === 1 ? '' : 's'}, and ${totalPts} point${totalPts === 1 ? '' : 's'}.`);
    }
  }

  return parts.join(' ');
}

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface Player {
  id: string;
  first_name: string;
  last_name: string;
  slug?: string;
  position?: string;
  jersey_number?: number | string;
  nationality?: string;
  headshot_url?: string;
  shoots?: string;
  catches?: string;
  height_cm?: number;
  weight_kg?: number;
  birth_date?: string;
  is_active?: boolean;
  team_id?: string;
  // Paid tier fields
  badge_tier?: 'free' | 'verified' | 'elite';
  subscription_status?: string;
  subscription_expires_at?: string;
  video_links?: { platform: string; url: string; title: string }[];
  certifications?: { type: string; name: string; issuer: string; year: string }[];
  is_birthdate_verified?: boolean;
  recruit_profile_visible?: boolean;
  open_to_college?: boolean;
  open_to_pro?: boolean;
  recruiting_bio?: string;
  parent_contact_name?: string;
  parent_contact_email?: string;
  career_stats?: any[];
  teams?: {
    name: string;
    slug?: string;
    logo_url?: string;
    home_rink_id?: string;
    league_id?: string;
    leagues?: { name: string; slug: string };
  };
}

function positionLabel(pos?: string): string {
  if (!pos) return 'Unknown';
  const map: Record<string, string> = {
    goalie: 'Goalie', defenseman: 'Defense', center: 'Center',
    left_wing: 'Left Wing', right_wing: 'Right Wing', forward: 'Forward',
  };
  return map[pos.toLowerCase()] || pos.replace('_', ' ');
}

function leagueBadgeStyle(leagueName?: string): React.CSSProperties {
  if (!leagueName) return { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' };
  const n = leagueName.toLowerCase();
  if (n.includes('nhl')) return { background: 'rgba(0,130,200,0.15)', color: '#0082C8' };
  if (n.includes('ahl')) return { background: 'rgba(0,150,80,0.15)', color: '#009650' };
  if (n.includes('khl')) return { background: 'rgba(200,30,30,0.15)', color: '#C81E1E' };
  if (n.includes('swedish') || n.includes('shl')) return { background: 'rgba(255,210,0,0.15)', color: '#FFD200' };
  if (n.includes('finnish') || n.includes('liiga')) return { background: 'rgba(20,100,200,0.15)', color: '#1464C8' };
  if (n.includes('del') || n.includes('deutsche')) return { background: 'rgba(220,180,0,0.15)', color: '#DCB400' };
  if (n.includes('czech')) return { background: 'rgba(30,80,180,0.15)', color: '#1E50B4' };
  if (n.includes('swiss') || n.includes('national league')) return { background: 'rgba(220,30,30,0.15)', color: '#DC1E1E' };
  if (n.includes('ohl')) return { background: 'rgba(255,140,0,0.15)', color: '#FF8C00' };
  if (n.includes('qmjhl') || n.includes('quebec')) return { background: 'rgba(220,30,30,0.15)', color: '#DC1E1E' };
  if (n.includes('whl')) return { background: 'rgba(0,100,180,0.15)', color: '#0064B4' };
  if (n.includes('echl')) return { background: 'rgba(140,60,180,0.15)', color: '#8C3CB4' };
  return { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' };
}

function StatCard({ label, value, unit }: { label: string; value?: string | number; unit?: string }) {
  if (!value) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '1rem 0.75rem',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: '0.375rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
        {value}{unit ? <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#888', marginLeft: '0.2em' }}>{unit}</span> : null}
      </p>
    </div>
  );
}

// ------ Page --------------------------------------------------------------------------------------------------------------------------------------
export default function PlayerDetail({ id }: { id: string }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [homeArena, setHomeArena] = useState<{ slug: string; name: string; city: string | null; country: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // /api/players accepts UUID, NHL id, and slug. If we arrived by UUID, redirect
    // to the canonical /directory/players/{slug} URL so the address bar matches
    // the human-readable identifier.
    const param = String(id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
    fetch(`/api/players?id=${encodeURIComponent(param)}&limit=1`)
      .then(r => r.json())
      .then(d => {
        const found = d?.data?.[0] || null;
        if (found && isUuid && found.slug && found.slug !== param) {
          window.location.replace(`/directory/players/${found.slug}`);
          return;
        }
        setPlayer(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Phase 1b SEO: inject noindex meta tag for thin player pages
  useEffect(() => {
    if (!player) return;
    // Count populated identifying fields (not name - name is the page's reason to exist)
    const fields = ['position', 'nationality', 'team_id', 'headshot_url', 'birth_date', 'jersey_number', 'height_cm', 'weight_kg', 'shoots'];
    const fieldCount = fields.filter(f => {
      const v = (player as any)[f];
      return v != null && v !== '';
    }).length;
    // Career stats contribute substantial unique content
    const statsWords = (player.career_stats?.length || 0) * 20;
    // The About/bio paragraph contributes a guaranteed ~80-150 unique words now
    // (depends on what data is present; use 80 baseline)
    const bioWords = 80;
    // The home arena + other team-mates also add internal-link-driven word count
    const linkWords = homeArena ? 10 : 0;
    const uniqueWordCount = statsWords + bioWords + linkWords;
    const decision = playerPageDecision(fieldCount, uniqueWordCount);
    if (decision.indexable) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = robotsMeta(decision);
    meta.setAttribute('data-seo-noindex', 'player');
    document.head.appendChild(meta);
    return () => {
      if (document.head.contains(meta)) document.head.removeChild(meta);
    };
  }, [player, homeArena]);

  // Fetch career stats
  useEffect(() => {
    if (!player?.id) return;
    fetch(`/api/players/player-stats-sync?playerId=${player.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.stats && d.stats.length > 0) {
          setPlayer(prev => prev ? { ...prev, career_stats: d.stats } : null);
        }
      })
      .catch(() => {});
  }, [player?.id]);

  // Fetch other players on same team
  useEffect(() => {
    if (!player?.team_id) return;
    const controller = new AbortController();
    fetch(`/api/players?teamId=${player.team_id}&limit=6`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        const others: Player[] = (d?.data || []).filter((p: Player) => p.id !== player.id);
        setOtherPlayers(others.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => controller.abort());
  }, [player?.team_id, player?.id]);

  // Fetch home arena for the player's team (rink page link)
  // Use current_team_abbreviation for NHL players (no team_id in nhl_players)
  useEffect(() => {
    const abbr = (player as any)?.current_team_abbreviation;
    if (!abbr) { setHomeArena(null); return; }
    const city = NHL_TEAM_CITY[abbr];
    if (!city) { setHomeArena(null); return; }
    const controller = new AbortController();
    fetch(`/api/rinks?city=ilike.${encodeURIComponent(city)}&limit=1`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        const r = (d?.data || [])[0];
        if (r) setHomeArena({ slug: r.slug, name: r.name, city: r.city, country: r.country });
        else setHomeArena(null);
      })
      .catch(() => setHomeArena(null))
      .finally(() => controller.abort());
  }, [(player as any)?.current_team_abbreviation]);

  // Enhanced Schema.org markup
  useEffect(() => {
    if (!player) return;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `https://rinkstop.com/directory/players/${player.id}`,
      name: `${player.first_name} ${player.last_name}`,
      givenName: player.first_name,
      familyName: player.last_name,
      url: `https://rinkstop.com/directory/players/${player.id}`,
      ...(player.headshot_url && { image: { '@type': 'ImageObject', url: player.headshot_url } }),
      ...(player.nationality && { nationality: [{ '@type': 'Country', name: player.nationality }] }),
      ...(player.height_cm && { height: [{ '@type': 'QuantitativeValue', value: player.height_cm, unitCode: 'CMT' }] }),
      ...(player.weight_kg && { weight: [{ '@type': 'QuantitativeValue', value: player.weight_kg, unitCode: 'KGM' }] }),
      ...(player.birth_date && { birthDate: player.birth_date }),
      ...(player.shoots && { dominantHand: { '@type': 'QualitativeValue', name: player.shoots === 'L' ? 'Left' : 'Right' } }),
      jobTitle: positionLabel(player.position),
      ...(player.teams?.name && {
        memberOf: {
          '@type': 'SportsTeam',
          name: player.teams.name,
          sport: 'Ice Hockey',
          ...(player.teams.leagues?.name && { parentOrganization: { '@type': 'SportsOrganization', name: player.teams.leagues.name } }),
          url: player.teams.slug ? `https://rinkstop.com/directory/teams/${player.teams.slug}` : undefined,
        }
      }),
      knowsAbout: ['Ice Hockey', player.position || 'Hockey'],
    };
    const existing = document.querySelector('script[type="application/ld+json"][data-player]');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-player', player.id);
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [player]);

  if (loading) return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
      <div className="skeleton" style={{ height: '2rem', width: '12rem', margin: '0 auto 1rem' }} />
      <div className="skeleton" style={{ height: '1rem', width: '8rem', margin: '0 auto' }} />
    </div>
  );

  if (!player) return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
      <p style={{ color: '#555', fontSize: '1.125rem', marginBottom: '1.5rem' }}>Player not found</p>
      <Link href="/directory/players" style={{ color: '#14B8A6', textDecoration: 'underline' }}>
        &larr; Back to Players Directory
      </Link>
    </div>
  );

  const leagueName = player.teams?.leagues?.name;
  const leagueSlug = player.teams?.leagues?.slug;
  const teamName = player.teams?.name;
  const teamSlug = player.teams?.slug;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8" style={{ fontSize: '0.75rem', color: '#555' }}>
        <Link href="/" style={{ color: '#555', textDecoration: 'none' }} className="hover:text-white transition-colors">Home</Link>
        <span style={{ margin: '0 0.3rem', color: 'rgba(255,255,255,0.2)' }}>›</span>
        <Link href="/directory" style={{ color: '#555', textDecoration: 'none' }} className="hover:text-white transition-colors">Directory</Link>
        <span style={{ margin: '0 0.3rem', color: 'rgba(255,255,255,0.2)' }}>›</span>
        <Link href="/directory/players" style={{ color: '#555', textDecoration: 'none' }} className="hover:text-white transition-colors">Players</Link>
        <span style={{ margin: '0 0.3rem', color: 'rgba(255,255,255,0.2)' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{player.first_name} {player.last_name}</span>
      </nav>

      {/* Back link */}
      <Link href="/directory/players" style={{ color: '#14B8A6', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'inline-block', textDecoration: 'none' }}>
        &larr; Back to Players
      </Link>

      {/* Main profile card */}
      <div style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>

          {/* Left: photo + identity */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minWidth: '120px' }}>
            {player.headshot_url ? (
              <img
                src={player.headshot_url}
                alt={`${player.first_name} ${player.last_name}`}
                style={{ width: 110, height: 110, borderRadius: '8px', objectFit: 'cover', background: '#1a1a1a', border: '2px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div style={{
                width: 110, height: 110, borderRadius: '8px', background: '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: 800, color: '#333', border: '2px solid rgba(255,255,255,0.1)',
              }}>
                🏒
              </div>
            )}
            {player.jersey_number && (
              <div style={{
                fontSize: '2rem', fontWeight: 900, color: 'rgba(255,255,255,0.12)',
                lineHeight: 1, letterSpacing: '-0.04em',
              }}>
                #{player.jersey_number}
              </div>
            )}
          </div>

          {/* Right: identity + meta */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              {player.position && (
                <span style={{
                  display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '0.2rem 0.5rem', borderRadius: '4px',
                  background: player.position === 'goalie' ? 'rgba(255,184,28,0.15)' : player.position === 'defenseman' ? 'rgba(30,91,156,0.15)' : 'rgba(20,184,166,0.15)',
                  color: player.position === 'goalie' ? '#FFB81C' : player.position === 'defenseman' ? '#4A90D9' : '#14B8A6',
                }}>
                  {positionLabel(player.position)}
                </span>
              )}
              {player.is_active === false && (
                <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#555' }}>
                  Inactive
                </span>
              )}
              {(player as any).role && (player as any).role !== 'player' && (
                <span style={{
                  display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '0.2rem 0.5rem', borderRadius: '4px',
                  background: (player as any).role === 'coach' ? 'rgba(255,184,28,0.15)' : (player as any).role === 'scout' ? 'rgba(20,184,166,0.15)' : 'rgba(168,85,247,0.15)',
                  color: (player as any).role === 'coach' ? '#FFB81C' : (player as any).role === 'scout' ? '#14B8A6' : '#A855F7',
                }}>
                  {(player as any).role === 'coach' ? 'Coach' : (player as any).role === 'scout' ? 'Scout' : (player as any).role === 'official' ? 'Official' : 'Staff'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <VerifiedBadge tier={player.badge_tier || 'free'} size="md" />
              {player.badge_tier && player.badge_tier !== 'free' && player.subscription_expires_at && (
                <span style={{ fontSize: '0.6875rem', color: '#555' }}>
                  Expires {new Date(player.subscription_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.75rem' }}>
              {player.first_name} {player.last_name}
            </h1>
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SaveButton favoriteType="player" favoriteId={player.id} entityName={`${player.first_name} ${player.last_name}`} size="sm" />
              <ClaimParentButton playerId={player.id} playerName={`${player.first_name} ${player.last_name}`} birthDate={player.birth_date || null} />
            </div>
            <ClaimedBy entityType="player" entityId={player.id} entityName={`${player.first_name} ${player.last_name}`} />

            {/* Upgrade CTA for free-tier players */}
            {(!player.badge_tier || player.badge_tier === 'free') && (
              <div style={{ marginBottom: '1rem' }}>
                <Link href="/add-listing" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)', border: 'none', borderRadius: '6px', color: '#000', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 12px rgba(255,215,0,0.25)' }}>
                  Become a Founding Member — $9.99
                </Link>
              </div>
            )}

            {/* Team + league links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              {teamName && (
                <Link
                  href={`/directory/teams/${teamSlug || player.team_id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    textDecoration: 'none', color: '#fff',
                  }}
                >
                  {player.teams?.logo_url ? (
                    <img src={player.teams.logo_url} alt="" style={{ width: 24, height: 24 }} />
                  ) : null}
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{teamName}</span>
                </Link>
              )}
              {leagueName && (
                <>
                  <span style={{ color: '#333', fontSize: '1rem' }}>·</span>
                  <Link
                    href={`/directory/leagues/${leagueSlug || 'nhl'}`}
                    style={{
                      display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '0.2rem 0.5rem', borderRadius: '4px',
                      textDecoration: 'none',
                      ...leagueBadgeStyle(leagueName),
                    }}
                  >
                    {leagueName}
                  </Link>
                </>
              )}
            </div>

            {player.nationality && (
              <p style={{ color: '#666', fontSize: '0.875rem' }}>
                🇬🇧 {player.nationality}
              </p>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
          <StatCard label="Height" value={player.height_cm} unit="cm" />
          <StatCard label="Weight" value={player.weight_kg} unit="kg" />
          <StatCard label="Shoots" value={player.shoots ? (player.shoots === 'L' ? 'Left' : player.shoots === 'R' ? 'Right' : player.shoots) : undefined} />
          <StatCard label="Birth Date" value={player.birth_date ? new Date(player.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined} />
          {player.birth_date && (
            <StatCard label="Age" value={(() => {
              const birth = new Date(player.birth_date!);
              const today = new Date();
              let age = today.getFullYear() - birth.getFullYear();
              const m = today.getMonth() - birth.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
              return age;
            })()} unit="years" />
          )}
        </div>
      </div>

      {/* Verified/Elite: Certifications */}
      {(player.badge_tier === 'verified' || player.badge_tier === 'elite') && player.certifications && player.certifications.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
            CERTIFICATIONS
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {player.certifications.map((cert, i) => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#14B8A6', marginBottom: '0.25rem' }}>{cert.type}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>{cert.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{cert.issuer}{cert.year ? ` · ${cert.year}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified/Elite: Video Gallery */}
      {(player.badge_tier === 'verified' || player.badge_tier === 'elite') && player.video_links && player.video_links.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
            VIDEO GALLERY
          </h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {player.video_links.map((video, i) => (
              <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(20,184,166,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                  <div style={{ width: 44, height: 44, borderRadius: '6px', background: 'rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {video.platform?.toLowerCase().includes('youtube') ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.5 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1AB7EA"><path d="M23 10.8c-.1-1.4-.6-2.6-1.7-3.5a4.6 4.6 0 0 0-2.6-.9c-1.9-.1-4.7-.1-4.7-.1h-.1s-2.9 0-4.7.1a4.6 4.6 0 0 0-2.6.9c-1.1.9-1.5 2.1-1.6 3.5-.1 1.5-.1 3-.1 3v2.4c0 1.4 0 2.6.1 3.9.1 1.4.5 2.6 1.7 3.5a4.6 4.6 0 0 0 2.6.9c1.9.1 4.7.1 4.7.1s2.9 0 4.7-.1a4.6 4.6 0 0 0 2.6-.9c1.1-.9 1.6-2.1 1.7-3.5.1-1.3.1-2.6.1-3.9v-2.4c0-1.4 0-2.8-.1-3.3zM15.7 14.1l-6.2 3.3V11l6.2-3.3v6.4z"/></svg>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title || 'Highlight Video'}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#666', textTransform: 'capitalize' }}>{video.platform || 'Video'}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* About / Bio */}
      <div style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem 1.75rem',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '0.875rem', letterSpacing: '-0.01em' }}>
          ABOUT
        </h2>
        <div style={{ color: '#bbb', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          {(() => {
            const bio = buildPlayerBio({
              first_name: player.first_name,
              last_name: player.last_name,
              position: player.position,
              jersey_number: player.jersey_number,
              nationality: player.nationality,
              birth_place: (player as any).birth_place,
              birth_date: player.birth_date,
              height_cm: player.height_cm,
              weight_kg: player.weight_kg,
              shoots: player.shoots,
              current_team_name: (player as any).current_team_name,
              teams: player.teams,
              career_stats: player.career_stats,
            });
            return <p>{bio}</p>;
          })()}

          {/* Quick fact list: birth place, draft, home arena */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {(player as any).birth_place && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#888', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.04)', borderRadius: '999px' }}>
                <span style={{ color: '#14B8A6' }}>📍</span> Born in {(player as any).birth_place}{player.nationality ? `, ${COUNTRY_NAMES[player.nationality] || player.nationality}` : ''}
              </span>
            )}
            {homeArena && (
              <Link
                href={`/directory/rinks/${homeArena.slug}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#14B8A6', padding: '0.3rem 0.7rem', background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: '999px', textDecoration: 'none' }}
              >
                <span>🏟️</span> Home: {homeArena.name}
              </Link>
            )}
            {player.position && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#888', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.04)', borderRadius: '999px' }}>
                <span style={{ color: '#14B8A6' }}>🏒</span> {positionLabel(player.position)}
              </span>
            )}
            {player.teams?.leagues?.name && (
              <Link
                href={`/directory/leagues/${player.teams.leagues.slug || 'nhl'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#888', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.04)', borderRadius: '999px', textDecoration: 'none' }}
              >
                <span style={{ color: '#14B8A6' }}>🏆</span> {player.teams.leagues.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Career Statistics */}
      <div style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', margin: 0 }}>
            CAREER STATISTICS
          </h2>
          <button
            onClick={() => {
              if (!player?.id) return;
              setStatsLoading(true);
              fetch('/api/highlightly/players/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: player.id }),
              })
                .then(r => r.json())
                .then(() => {
                  setStatsLoading(false);
                  return fetch(`/api/players/player-stats-sync?playerId=${player.id}`);
                })
                .then(r => r.json())
                .then(d => {
                  if (d.stats && d.stats.length > 0) {
                    setPlayer(prev => prev ? { ...prev, career_stats: d.stats } : null);
                  }
                  setStatsLoading(false);
                })
                .catch(() => setStatsLoading(false));
            }}
            disabled={statsLoading}
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#666',
              cursor: statsLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {statsLoading ? 'Syncing...' : 'Sync Stats'}
          </button>
        </div>

        {!player.career_stats || player.career_stats.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '2.5rem 1rem',
            textAlign: 'center',
          }}>
            <p style={{ color: '#444', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
              No career statistics available yet
            </p>
            <p style={{ color: '#333', fontSize: '0.8125rem' }}>
              Stats are synced from official league data when available.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {player.position === 'goalie'
                    ? ['Season', 'GP', 'W', 'L', 'GAA', 'SV%', 'SO'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#666', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))
                    : ['Season', 'GP', 'G', 'A', 'Pts', 'PIM', '+/-'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#666', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))
                  }
                </tr>
              </thead>
              <tbody>
                {player.career_stats.map((stat: any, i: number) => (
                  <tr key={stat.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {player.position === 'goalie' ? (
                      <>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff', fontWeight: 600 }}>{stat.season}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#888' }}>{stat.games_played ?? '-'}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.wins ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.losses ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.goals_against_avg ?? '-'}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.save_pct ? `${(parseFloat(stat.save_pct) * 100).toFixed(1)}%` : '-'}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.shutouts ?? 0}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff', fontWeight: 600 }}>{stat.season}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#888' }}>{stat.games_played ?? '-'}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.goals ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#fff' }}>{stat.assists ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--red)', fontWeight: 700 }}>{stat.points ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#888' }}>{stat.penalty_minutes ?? 0}</td>
                        <td style={{ padding: '0.75rem 0.75rem', color: (stat.plus_minus ?? 0) >= 0 ? '#14B8A6' : '#ef4444' }}>
                          {stat.plus_minus != null ? (stat.plus_minus >= 0 ? `+${stat.plus_minus}` : stat.plus_minus) : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Player Highlights */}
      {player.teams?.name && (
        <div style={{ marginTop: '1.5rem' }}>
          <HighlightsGrid
            limit={4}
            teamFilter="homeTeamName"
            teamName={player.teams.name.replace('Los Angeles Kings', 'Los Angeles').replace('San Jose Sharks', 'San Jose').replace('Anaheim Ducks', 'Anaheim').split(' ')[0]}
            title={`${player.first_name} ${player.last_name} HIGHLIGHTS`}
            columns={2}
          />
        </div>
      )}

      {/* Other players on team */}
      {otherPlayers.length > 0 && (
        <div style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
            OTHER PLAYERS ON {teamName?.toUpperCase() || 'THIS TEAM'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {otherPlayers.map(p => (
              <Link
                key={p.id}
                href={`/directory/players/${p.slug}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(255,255,255,0.15)';
                  el.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(255,255,255,0.06)';
                  el.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                {p.headshot_url ? (
                  <img src={p.headshot_url} alt="" style={{ width: 36, height: 36, borderRadius: '4px', objectFit: 'cover', background: '#1a1a1a', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: '4px', background: '#1a1a1a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, color: '#444', flexShrink: 0,
                  }}>
                    {(p.first_name?.[0] || '') + (p.last_name?.[0] || '')}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.first_name} {p.last_name}
                  </p>
                  {p.position && (
                    <p style={{ fontSize: '0.75rem', color: '#555' }}>{positionLabel(p.position)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}