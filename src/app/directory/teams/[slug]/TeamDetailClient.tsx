'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NHL_TEAM_DATA } from '@/lib/nhl-teams-data';
import { getChainForSlug } from '@/lib/nhl-franchise-history';
import { FANATICS_ADS } from '@/lib/fanatics-ads';
type NHLStaticData = typeof NHL_TEAM_DATA[string];
import NHLShopWidget from '@/components/NHLShopWidget';
import TicketmasterAd from '@/components/TicketmasterAd';
import SaveButton from '@/components/SaveButton';
import { ClaimedBy } from '@/components/ClaimedBy';
import ListingContactFormMount from '@/components/ListingContactFormMount';

interface TeamData {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  home_rink_id: string | null;
  logo_url: string | null;
  leagues?: { name: string } | null;
}

interface PlayerData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  jersey_number: number | null;
  headshot_url: string | null;
}

interface ArticleData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  published_at: string;
  game_date: string | null;
  og_image_url: string | null;
}

export default function TeamDetailClient({
  team,
  players,
  articles = [],
}: {
  team: TeamData;
  players: PlayerData[];
  articles?: ArticleData[];
}) {
  const staticData = (NHL_TEAM_DATA[team.slug] || {}) as NHLStaticData;
  const hasRichData = Object.keys(staticData).length > 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.875rem' }}>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/teams" style={{ color: '#555' }}>Teams</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{team.name}</span>
      </nav>

      {/* Sticky team header */}
      <div style={{
        position: 'sticky', top: '60px', zIndex: 20, background: 'var(--bg)',
        paddingTop: '0.75rem', paddingBottom: '0.75rem',
        borderBottom: '2px solid var(--red)', marginBottom: '1.5rem',
      }}>
        <Link href="/directory/teams" style={{ color: 'var(--red)', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>
          ← All Teams
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {team.logo_url ? (
            <img src={team.logo_url} alt="" style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '8px', background: 'linear-gradient(135deg, #C8102E, #041E42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏒</div>
          )}
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
              {team.name.toUpperCase()}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
              {[team.city, team.country].filter(Boolean).join(', ')}
              {team.leagues?.name ? ` · ${team.leagues.name}` : ''}
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <SaveButton favoriteType="team" favoriteId={team.id} entityName={team.name} size="sm" />
            </div>
            <ClaimedBy entityType="team" entityId={team.id} entityName={team.name} />
            <div style={{ marginTop: '1rem' }}>
              <ListingContactFormMount
                listingType="team"
                listingId={team.id}
                listingName={team.name}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}
      <TicketmasterAd size="468x60" />

      {/* Rich team info section */}
      {hasRichData && (
        <>
          <section style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', lineHeight: 1.75, maxWidth: '720px', marginBottom: '1.25rem', borderLeft: '3px solid var(--red)', paddingLeft: '1rem' }}>
              {staticData.description as string}
            </p>
          </section>

          {/* NHL Shop Jersey Ad */}
          {(() => {
            const ad = FANATICS_ADS[team.slug as string];
            return ad ? (
              <NHLShopWidget
                teamName={team.name}
                teamSlug={team.slug}
                primaryColor={staticData.colors?.[0] || '#C8102E'}
                secondaryColor={staticData.colors?.[1] || '#FFFFFF'}
                affiliateLink={ad?.affiliateLink}
                adImageUrl={ad?.imageUrl}
                adWidth={ad?.adWidth}
                adHeight={ad?.adHeight}
              />
            ) : null;
          })()}

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.625rem', marginBottom: '2rem' }}>
            {[
              { label: 'Founded', value: staticData.founded || ' -- ', highlight: false },
              { label: 'Arena', value: staticData.arena || ' -- ', highlight: false },
              { label: 'Stanley Cups', value: staticData.championships || 0, highlight: true },
              { label: 'Division', value: staticData.division || ' -- ', highlight: false },
              { label: 'Conference', value: staticData.conference || ' -- ', highlight: false },
              { label: 'Captain', value: staticData.captain || ' -- ', highlight: false },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1rem' }}>
                <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.2rem' }}>{s.label}</p>
                <p style={{ fontSize: s.highlight ? '1.5rem' : '0.875rem', fontWeight: s.highlight ? 800 : 700, color: s.highlight ? 'var(--red)' : '#fff' }}>{String(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Notable Players */}
          {staticData.notablePlayers && staticData.notablePlayers.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.875rem' }}>NOTABLE PLAYERS</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {staticData.notablePlayers.map(player => (
                  <span key={player} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {player}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Coaching & Management */}
          {[
            { role: 'Head Coach', name: staticData.coach },
            { role: 'General Manager', name: staticData.generalManager },
            { role: 'Captain', name: staticData.captain },
          ].filter(s => s.name).length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.875rem' }}>COACHING & MANAGEMENT</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
                {[
                  { role: 'Head Coach', name: staticData.coach },
                  { role: 'General Manager', name: staticData.generalManager },
                  { role: 'Captain', name: staticData.captain },
                ].filter(s => s.name).map(s => (
                  <div key={s.role} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.2rem' }}>{s.role}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{s.name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </>
      )}

      {/* Navigation breadcrumb trail */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: staticData.conference === 'Western' ? 'Western Conf.' : 'Eastern Conf.', href: staticData.conference === 'Western' ? '/directory/nhl/western' : '/directory/nhl/eastern' },
          { label: staticData.division ? `${staticData.division} Division` : 'NHL', href: staticData.division ? `/directory/nhl/${staticData.division.toLowerCase()}` : '/directory/nhl' },
          { label: 'NHL Hub', href: '/directory/nhl' },
          { label: 'NHL Playoffs', href: '/directory/nhl/playoffs' },
        ].filter(n => n.label).map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
            textDecoration: 'none', color: 'rgba(255,255,255,0.55)', background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>{n.label}</Link>
        ))}
      </div>

      {/* Home rink and league */}
      <TeamRelated leagueId={team.league_id} currentTeamId={team.id} homeRinkId={team.home_rink_id} />

      {/* Franchise History — shown for teams with relocations/renames.
          Renders independently of NHL_TEAM_DATA so it appears for newer
          teams (e.g. Utah Hockey Club) that don't have static data yet. */}
      {(() => {
        const chain = getChainForSlug(team.slug);
        if (!chain) return null;
        return (
          <section style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              FRANCHISE HISTORY
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
              {chain.blurb}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {chain.chain.map((entry, i) => {
                const isCurrent = i === chain.chain.length - 1;
                return (
                  <div
                    key={entry.slug}
                    style={{
                      background: isCurrent ? 'rgba(200,16,46,0.06)' : 'var(--s2)',
                      border: isCurrent ? '1px solid rgba(200,16,46,0.3)' : '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--red)' : '#fff' }}>
                        {entry.name}
                        {isCurrent && <span style={{ marginLeft: '0.5rem', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>CURRENT</span>}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums' }}>
                        {entry.years}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                      {entry.city}
                      {entry.notes ? <span style={{ color: 'rgba(255,255,255,0.35)' }}> — {entry.notes}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href={`/directory/nhl/history#${chain.current}`}
              style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}
            >
              View all NHL franchise chains →
            </Link>
          </section>
        );
      })()}

      <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

      {/* Roster */}
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
          ROSTER  --  {players.length} PLAYERS
        </h2>
        {players.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem' }}>No roster data available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {players.map(p => (
              <Link key={p.id} href={`/directory/players/${p.id}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                {p.headshot_url ? (
                  <img src={p.headshot_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#1a2D45' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a2D45', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.first_name} {p.last_name}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {p.position?.replace('_', ' ')}{p.jersey_number ? ` · #${p.jersey_number}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Latest articles for this team (cross-link from rewriter, 2026-06-12) */}
      {articles.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>Latest Highlights</h2>
            <Link href={`/news?team=${team.slug}`} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>All highlights →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.625rem' }}>
            {articles.map((a) => (
              <Link key={a.id} href={`/news/${a.slug}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                {a.og_image_url && (
                  <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#1a2D45' }}>
                    <img src={a.og_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                )}
                <div style={{ padding: '0.625rem 0.875rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', lineHeight: 1.3, margin: '0 0 0.25rem' }}>{a.title}</p>
                  {a.subtitle && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, margin: 0 }}>{a.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ticketmaster NHL Banner - 300x250 */}
      <TicketmasterAd size="300x250" />
    </div>
  );
}

function TeamRelated({ leagueId, currentTeamId, homeRinkId }: { leagueId: string | null; currentTeamId: string; homeRinkId?: string | null }) {
  const [homeRink, setHomeRink] = useState<any>(null);
  const [league, setLeague] = useState<any>(null);
  const [otherTeams, setOtherTeams] = useState<any[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    if (homeRinkId) {
      fetch(`/api/rinks?id=${homeRinkId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const rink = Array.isArray(data) ? data[0] : (data?.data?.[0]);
          if (rink) setHomeRink(rink);
        })
        .catch(() => {});
    }
    if (leagueId) {
      fetch(`/api/leagues?id=${leagueId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const lg = Array.isArray(data) ? data[0] : (data?.data?.[0]);
          if (lg) setLeague(lg);
        })
        .catch(() => {});
      fetch(`/api/teams?leagueId=${leagueId}&limit=6`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const teams = Array.isArray(data) ? data : (data?.data || []);
          setOtherTeams(teams.filter((t: any) => t.id !== currentTeamId).slice(0, 4));
        })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [leagueId, currentTeamId, homeRinkId]);

  return (
    <>
      {homeRink && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>Home Arena</p>
          <Link href={`/directory/rinks/${homeRink.slug || homeRink.id}`} style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', textDecoration: 'none' }}>{homeRink.name || homeRink.address || 'View Rink'}</Link>
        </div>
      )}
      {league && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>League</p>
          <Link href={`/directory/leagues/${league.id}`} style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', textDecoration: 'none' }}>{league.name}</Link>
        </div>
      )}
      {otherTeams.length > 0 && (
        <div>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>More in {league?.name || 'League'}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {otherTeams.map((t: any) => (
              <Link key={t.id} href={`/directory/teams/${t.slug}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600 }}>
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
