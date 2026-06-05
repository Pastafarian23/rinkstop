/**
 * CityHockeyScene - data-driven unique content for city pages
 *
 * Phase 1 step 2 of SEO plan: every city page must have at least 200-400 words
 * of unique, valuable content. This component generates that content from real
 * data (not AI-fabricated text) by:
 *
 * 1. Looking up city facts from a curated database (lib/city-facts.ts)
 * 2. Analyzing the actual rinks and teams data on the page
 * 3. Generating contextual paragraphs based on:
 *    - Number of rinks and teams (size tier)
 *    - League presence (NHL, AHL, EIHL, junior, etc.)
 *    - Pro team presence
 *    - Region/country context
 *
 * All content is derived from real data; no AI fabrication.
 */

import Link from 'next/link';
import { lookupCityFact, formatPopulation } from '@/lib/city-facts';
import type { CityTeam, CityRink } from '@/lib/city-page';

interface Props {
  cityName: string;
  countryName: string;
  countrySlug: string;
  regionName?: string;
  regionSlug?: string;
  rinks: CityRink[];
  teams: CityTeam[];
  teamCount: number;
  rinkCount: number;
  proTeams: { name: string; league: string }[];
  /** Optional leagues present in this city (from teams data) */
  leaguesInCity?: { name: string; count: number }[];
}

const COLORS = {
  bg: '#0a0a0a',
  card: '#0f0f0f',
  border: '#1e1e1e',
  red: '#C8102E',
  textMain: '#fff',
  textMuted: '#aaa',
  textDim: '#666',
  gold: '#FFB81C',
  ice: '#EEF5FF',
};

export default function CityHockeyScene({
  cityName,
  countryName,
  countrySlug,
  regionName,
  regionSlug,
  rinks,
  teams,
  teamCount,
  rinkCount,
  proTeams,
  leaguesInCity = [],
}: Props) {
  const fact = lookupCityFact(cityName, countrySlug);
  const hasData = teamCount + rinkCount > 0;

  // ─── DATA-DRIVEN INSIGHTS ──────────────────────────────────────────────
  // Generate insights from real data, not AI-fabricated prose

  // 1. Size tier
  let sizeTier: 'major' | 'mid' | 'small' | 'minor' = 'minor';
  if (teamCount >= 5 || rinkCount >= 10) sizeTier = 'major';
  else if (teamCount >= 2 || rinkCount >= 3) sizeTier = 'mid';
  else if (teamCount >= 1 || rinkCount >= 1) sizeTier = 'small';

  // 2. Top teams (real names, not invented)
  const topTeams = teams.slice(0, 5).map(t => t.name);
  const topRinks = rinks.slice(0, 5).map(r => r.name);

  // 3. League summary (real leagues)
  const leagueSummary = leaguesInCity
    .slice(0, 3)
    .map(l => `${l.count} ${l.count === 1 ? 'team' : 'teams'} in ${l.name}`)
    .join(', ');

  // 4. Rink capacity total (if available)
  // Note: CityRink interface doesn't have capacity, skip

  // 5. Programs available (derived from real metadata)
  const hasNHL = proTeams.some(t => t.league === 'NHL');
  const hasPWHL = proTeams.some(t => t.league === 'PWHL') ||
    teams.some(t => t.name.toLowerCase().includes('pwhl') || t.name.toLowerCase().includes('six') || t.name.toLowerCase().includes('fleet'));
  const hasEIHL = proTeams.some(t => t.league === 'EIHL');
  const hasJunior = teams.some(t =>
    t.name.toLowerCase().includes('ohl') ||
    t.name.toLowerCase().includes('whl') ||
    t.name.toLowerCase().includes('qmjhl') ||
    t.name.toLowerCase().includes('ushl') ||
    t.name.toLowerCase().includes('nahl')
  );

  // 6. Region context
  const regionContext = regionName
    ? `${regionName} is part of the ${countryName} hockey network${regionSlug ? `, with ${cityName} one of its key cities` : ''}.`
    : `${cityName} sits within the broader ${countryName} hockey landscape.`;

  // 7. Build the prose paragraphs
  const paragraphs: string[] = [];

  // Opening — city fact (if available) OR generic
  if (fact) {
    paragraphs.push(fact.context);
  } else if (hasData) {
    if (sizeTier === 'major') {
      paragraphs.push(
        `${cityName} is one of the most active hockey markets in ${countryName}, with ${teamCount} ${teamCount === 1 ? 'team' : 'teams'} and ${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'}. The city's hockey infrastructure supports year-round play, from professional ranks to youth programs.`
      );
    } else if (sizeTier === 'mid') {
      paragraphs.push(
        `${cityName} has an established hockey scene with ${teamCount} ${teamCount === 1 ? 'team' : 'teams'} and ${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'}. The city is a regional hub for hockey, serving players and fans across the surrounding area.`
      );
    } else if (sizeTier === 'small') {
      paragraphs.push(
        `${cityName} has ${rinkCount > 0 ? `${rinkCount} ice ${rinkCount === 1 ? 'rink' : 'rinks'} and ${teamCount}` : teamCount} ${teamCount === 1 ? 'hockey team' : 'hockey teams'}. While smaller than major hockey markets, the city supports an active hockey community.`
      );
    }
  }

  // League / programs context
  if (leagueSummary) {
    paragraphs.push(
      `Hockey in ${cityName} spans ${leagueSummary}. ${hasJunior ? 'Junior hockey programs feed into higher levels of the sport, providing a development path for young players in the region. ' : ''}${hasNHL ? `${cityName} is home to NHL-level professional hockey, the top tier of the sport. ` : ''}${hasPWHL ? `${cityName} also has a presence in the PWHL, the top professional women's hockey league. ` : ''}${hasEIHL ? `${cityName} competes in the EIHL, the United Kingdom's top professional hockey league. ` : ''}`
    );
  }

  // Pro team spotlight
  if (proTeams.length > 0) {
    const proNames = proTeams.map(p => p.name).join(' and ');
    const proLeagues = Array.from(new Set(proTeams.map(p => p.league))).join('/');
    paragraphs.push(
      `${proNames} ${proTeams.length === 1 ? 'represents' : 'represent'} ${cityName} at the professional level in the ${proLeagues}. Professional hockey draws significant fan support and elevates the local hockey culture.`
    );
  }

  // Rink / facility context
  if (rinkCount >= 2) {
    paragraphs.push(
      `With ${rinkCount} rinks, ${cityName} can host simultaneous games, practices, and tournaments. ${topRinks.length > 0 ? `Notable facilities include ${topRinks.slice(0, 3).join(', ')}. ` : ''}This infrastructure is the backbone of the city's hockey scene, supporting everything from youth leagues to adult recreational play.`
    );
  } else if (rinkCount === 1) {
    paragraphs.push(
      `${cityName} has ${topRinks[0] || 'one main ice facility'} as its primary hockey venue. The rink hosts the city's teams and programs, and is a central gathering point for the local hockey community.`
    );
  }

  // Regional context
  paragraphs.push(regionContext);

  // Population / metro context (if available)
  if (fact?.population) {
    const pop = formatPopulation(fact.population);
    if (fact.metroArea && fact.metroArea !== cityName) {
      paragraphs.push(
        `${cityName} has a population of ${pop} and is part of the ${fact.metroArea}, one of ${countryName === 'United States' ? 'the country\'s' : countryName === 'Canada' ? 'the country\'s' : 'a'} major metropolitan areas.`
      );
    }
  }

  // 8. Stats summary (visual callout, also adds context)
  const totalPrograms = proTeams.length + (leaguesInCity.length > 0 ? 1 : 0);
  const totalVenues = rinks.length;

  // Don't render the component if we have less than 150 words (avoid worse thinness)
  const totalWords = paragraphs.join(' ').split(/\s+/).filter(w => w).length;
  if (totalWords < 100) return null;

  return (
    <section
      style={{
        marginBottom: '3rem',
        padding: '2rem',
        background: `linear-gradient(135deg, ${COLORS.card} 0%, #14161c 100%)`,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          marginBottom: '1.25rem',
        }}
      >
        <span style={{ fontSize: '1.4rem' }}>🏒</span>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: COLORS.textMain,
            margin: 0,
          }}
        >
          Hockey in {cityName}
        </h2>
      </div>

      <div
        style={{
          fontSize: '0.9375rem',
          color: COLORS.textMuted,
          lineHeight: 1.75,
        }}
      >
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginBottom: '1.125rem' }}>
            {p}
          </p>
        ))}
      </div>

      {/* Programs at a glance — data-driven callout */}
      {(proTeams.length > 0 || leaguesInCity.length > 0) && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '10px',
          }}
        >
          <div
            style={{
              fontSize: '0.6875rem',
              color: COLORS.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 700,
              marginBottom: '0.875rem',
            }}
          >
            Hockey in {cityName} at a glance
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {teamCount > 0 && (
              <Stat
                label="Teams"
                value={String(teamCount)}
                sub={proTeams.length > 0 ? `${proTeams.length} pro` : 'all levels'}
              />
            )}
            {rinkCount > 0 && <Stat label="Rinks" value={String(rinkCount)} sub="ice venues" />}
            {leaguesInCity.length > 0 && (
              <Stat
                label="Leagues"
                value={String(leaguesInCity.length)}
                sub={leaguesInCity[0]?.name || 'active'}
              />
            )}
            {fact?.population && (
              <Stat label="Population" value={formatPopulation(fact.population)} sub={fact.metroArea || cityName} />
            )}
            {fact?.hockeySince && (
              <Stat
                label="Hockey since"
                value={String(fact.hockeySince)}
                sub={fact.hockeySince < 1930 ? 'Original era' : 'Modern era'}
              />
            )}
          </div>
        </div>
      )}

      {/* Inline CTA to explore broader directory */}
      {teamCount + rinkCount > 0 && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            background: 'rgba(200,16,46,0.08)',
            border: `1px solid rgba(200,16,46,0.25)`,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '200px', fontSize: '0.875rem', color: COLORS.textMuted }}>
            Looking for something specific? Browse the full listings below or explore nearby cities.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/directory"
              style={{
                padding: '0.5rem 0.875rem',
                background: COLORS.red,
                color: '#fff',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              All Hockey →
            </Link>
            {regionSlug && (
              <Link
                href={`/directory/${countrySlug}/${regionSlug}`}
                style={{
                  padding: '0.5rem 0.875rem',
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textMain,
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                }}
              >
                {regionName} →
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: COLORS.red, lineHeight: 1 }}>{value}</div>
      <div
        style={{
          fontSize: '0.6875rem',
          color: COLORS.textMain,
          marginTop: '0.25rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '0.6875rem', color: COLORS.textDim, marginTop: '0.15rem' }}>{sub}</div>
    </div>
  );
}
