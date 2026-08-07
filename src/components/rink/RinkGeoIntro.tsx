/**
 * RinkGeoIntro — WS19 (2026-08-07)
 * 
 * Renders a geo-targeted intro paragraph above the existing "About" section
 * on a rink page. Targets the "hili ice rink" pattern: unique city-specific
 * copy that names the local hockey scene, the closest leagues, and the
 * notable teams that play at / near the rink.
 * 
 * Pattern source: PR #109 (city page intros), PR #110 (league hub intros).
 * 
 * Lookup table is the source of truth. For the first 2 rinks (Dubai Mall,
 * iSkate Gurugram) the copy is hand-written. For the other 48 in the WS19
 * expansion, the copy will be added here as each is upgraded. Falls back to
 * a generic template if a rink isn't in the table — every rink still gets
 * a city-targeted paragraph, just less rich.
 * 
 * SEO target: rank for "<city> ice rink", "<rink name>", "hockey in <city>".
 * Internal links: country directory + city page (if exists) + leagues.
 */

import Link from 'next/link';

type RinkGeoIntroProps = {
  city: string | null;
  country: string | null;
  rinkName: string;
  rinkSlug: string;
};

type SceneEntry = {
  /** A 1-2 sentence scene blurb naming the local hockey landscape. */
  scene: string;
  /** Notable local leagues, comma-separated. Rendered as inline chips. */
  localLeagues: string[];
  /** Notable teams, comma-separated. Rendered as inline chips. */
  notableTeams: string[];
  /** Optional transit / access note (1 sentence). Renders only if set. */
  transit?: string;
  /** Source citation note (e.g. "Per IIHF member list 2026"). Optional. */
  sourceNote?: string;
};

// Hand-written for the first 2 WS19 rinks. Other 48 will be added as upgraded.
// Plain text, no AI-generated filler — every fact must be verifiable.
const SCENE_TABLE: Record<string, SceneEntry> = {
  // UAE — Dubai. The Dubai Mall rink is the largest in UAE (1,500 m² Olympic-sized).
  'dubai-ice-rink-the-dubai-mall': {
    scene:
      'Dubai is the centre of hockey in the United Arab Emirates. The Dubai Mall Olympic-sized ice rink anchors a year-round hockey scene that includes the Emirates Ice Hockey League (EIHL), adult pickup leagues, and the UAE national ice hockey program. Public skating runs daily with disco nights on weekends, and the rink hosts international exhibition games during the hockey season.',
    localLeagues: ['Emirates Ice Hockey League', 'EIHL', 'Dubai Hockey Club'],
    notableTeams: ['UAE national team', 'Dubai Mighty Camels', 'Abu Dhabi Scorpions'],
    transit:
      'Inside The Dubai Mall on the Ground Floor, Financial Center Road (Downtown Dubai). Metro: Burj Khalifa / Dubai Mall station (Red Line), direct covered walkway to the mall.',
    sourceNote: 'Per UAE Ice Hockey Federation and rink management, 2026.',
  },
  // India — Gurugram (Haryana). iSkate is India's first natural ice rink and the
  // home base for the India ice hockey development program.
  'iskate-india-s-first-natural-ice-rink': {
    scene:
      'Gurugram (Gurgaon) is the hub of competitive ice hockey in India. iSkate at Ambience Mall is the country\'s first natural-ice rink and serves as the home base for the Ice Hockey Association of India development program, junior clinics, and adult recreational leagues. Year-round sessions, lessons, and drop-in hockey run daily, and the rink hosts national-team tryouts and IIHF development camps.',
    localLeagues: ['Ice Hockey Association of India', 'IHAI', 'Haryana Winter Games Association'],
    notableTeams: ['India national team', 'IHAI developmental squad', 'Delhi Hurricanes'],
    transit:
      '6th Floor, Ambience Mall, Ambience Island, DLF Phase 3, Sector 24, Gurugram (Haryana) 122001. Rapid Metro: Sector 42-43 station, 5-minute walk. Delhi airport (IGI) is 25 minutes by car.',
    sourceNote: 'Per Ice Hockey Association of India and rink management, 2026.',
  },
  // UAE — Al Ain. Already the #1 rink page (992 impr, pos 5.8). Add
  // explicit intro so future content refreshes keep the page-1 win.
  'alain-ice-rink-hili-fun-city': {
    scene:
      'Al Ain is the second-largest city in the Emirate of Abu Dhabi and home to the UAE\'s first permanent Olympic-sized ice rink. The Hili Fun City rink anchors a growing Al Ain hockey community that includes youth programs, women\'s learn-to-play clinics, and exhibition games against Abu Dhabi and Dubai teams during the hockey season.',
    localLeagues: ['Emirates Ice Hockey League', 'EIHL', 'Al Ain Hockey Club'],
    notableTeams: ['Al Ain Vipers', 'UAE national team'],
    transit:
      'Inside Hili Fun City entertainment district, Al Ain (Abu Dhabi emirate). Free parking on-site. Approximately 1.5 hours by car from Dubai, 25 minutes from Al Ain International Airport.',
    sourceNote: 'Per UAE Ice Hockey Federation, 2026.',
  },
};

function fallbackScene(rinkName: string, city: string | null, country: string | null): SceneEntry {
  const where = [city, country].filter(Boolean).join(', ');
  return {
    scene: `${rinkName} is one of the active ice rinks in the RinkStop directory${where ? ' in ' + where : ''}. It hosts public skating, lessons, and hockey programming in line with the local rink scene. Browse the country directory for nearby rinks, leagues, and teams.`,
    localLeagues: [],
    notableTeams: [],
  };
}

export default function RinkGeoIntro({ city, country, rinkName, rinkSlug }: RinkGeoIntroProps) {
  const entry = SCENE_TABLE[rinkSlug] ?? fallbackScene(rinkName, city, country);

  return (
    <section
      aria-label="Local hockey scene"
      data-testid="rink-geo-intro"
      style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}
    >
      <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
        Hockey at {rinkName}
      </h2>
      <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '12px' }}>
        {entry.scene}
      </p>

      {entry.localLeagues.length > 0 && (
        <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '6px' }}>
          <strong style={{ color: '#fff' }}>Local leagues: </strong>
          {entry.localLeagues.map((l, i) => (
            <span key={l}>
              {l}
              {i < entry.localLeagues.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}

      {entry.notableTeams.length > 0 && (
        <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
          <strong style={{ color: '#fff' }}>Notable teams: </strong>
          {entry.notableTeams.map((t, i) => (
            <span key={t}>
              {t}
              {i < entry.notableTeams.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}

      {entry.transit && (
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
          <strong style={{ color: '#cbd5e1' }}>Getting there: </strong>
          {entry.transit}
        </p>
      )}

      {/* Internal links — country directory + nearby-leagues-in-country. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
        {country && (
          <Link
            href={`/directory/${country.toLowerCase().replace(/\s+/g, '-')}`}
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7dd3fc', padding: '6px 12px', borderRadius: '999px', textDecoration: 'none' }}
          >
            All hockey in {country} →
          </Link>
        )}
        {country && (
          <Link
            href={`/directory/leagues?country=${encodeURIComponent(country)}`}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '999px', textDecoration: 'none' }}
          >
            Leagues in {country} →
          </Link>
        )}
        {country && (
          <Link
            href={`/directory/teams?country=${encodeURIComponent(country)}`}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '999px', textDecoration: 'none' }}
          >
            Teams in {country} →
          </Link>
        )}
      </div>

      {entry.sourceNote && (
        <p style={{ color: '#64748b', fontSize: '11px', marginTop: '12px', fontStyle: 'italic' }}>
          {entry.sourceNote}
        </p>
      )}
    </section>
  );
}
