import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStaffRecord, getStaffSourceRef } from '@/lib/staff-record';
import { withDefaultOg } from '@/lib/metadata-defaults';
import UnifiedProfileLink from '@/components/profile/UnifiedProfileLink';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 86400;
export const dynamicParams = true;

/**
 * Staff roles and their public labels.
 *
 * The four staff directories (/directory/coaches, /directory/scouts,
 * /directory/officials, /directory/staff) all render from the same
 * `StaffDirectory` component and all link here. One detail route for
 * every staff role, so no staff card can point at a route that does not
 * exist.
 */
const ROLE_LABEL: Record<string, string> = {
  coach: 'hockey coach',
  head_coach: 'hockey coach',
  assistant_coach: 'assistant coach',
  goalie_coach: 'goalie coach',
  skills_coach: 'skills coach',
  manager: 'hockey coach',
  scout: 'hockey scout',
  official: 'hockey official',
  executive: 'team executive',
  staff: 'hockey staff',
};

/** The URL segment this role is listed under, for a "browse more" link. */
const ROLE_SEGMENT: Record<string, string> = {
  coach: 'coaches',
  head_coach: 'coaches',
  assistant_coach: 'coaches',
  goalie_coach: 'coaches',
  skills_coach: 'coaches',
  manager: 'coaches',
  scout: 'scouts',
  official: 'officials',
  executive: 'staff',
  staff: 'staff',
};

/** The short label used in headings and titles. */
const ROLE_TITLE: Record<string, string> = {
  coach: 'Coach',
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  goalie_coach: 'Goalie Coach',
  skills_coach: 'Skills Coach',
  manager: 'Coach',
  scout: 'Scout',
  official: 'Official',
  executive: 'Executive',
  staff: 'Staff',
};

function buildDescription(r: {
  full_name: string;
  role: string;
  current_team_name: string | null;
  league_name: string | null;
}): string {
  const roleLabel = ROLE_LABEL[r.role] || r.role;
  const team = r.current_team_name
    ? r.league_name
      ? ` with the ${r.current_team_name} in the ${r.league_name}`
      : ` with the ${r.current_team_name}`
    : '';
  return `${r.full_name} — ${roleLabel}${team}. Profile on RinkStop.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getStaffRecord(id);

  if (!record) {
    return { title: 'Coach Not Found | RinkStop', robots: { index: false, follow: false } };
  }

  const description = buildDescription(record);
  const roleName = ROLE_TITLE[record.role] || 'Staff';
  const title = `${record.full_name} — ${roleName}${
    record.current_team_name ? ` | ${record.current_team_name}` : ''
  } | RinkStop`;

  return {
    // `absolute` opts out of the layout's `%s | RinkStop` template. Without
    // it the title renders as "... | RinkStop | RinkStop" — the layout
    // template appends the brand even when the page title already ends
    // with it. (Same bug class as the /dataset-license / /hockey-database
    // title duplication fixed on 2026-09-14.)
    title: { absolute: title },
    description,
    alternates: { canonical: `https://rinkstop.com/directory/coaches/${id}` },
    openGraph: withDefaultOg({
      title: `${record.full_name} — ${roleName}${record.current_team_name ? ` | ${record.current_team_name}` : ''}`,
      description,
      url: `https://rinkstop.com/directory/coaches/${id}`,
      type: 'profile',
      ...(record.headshot_url
        ? { images: [{ url: record.headshot_url, width: 200, height: 200, alt: record.full_name }] }
        : {}),
    }),
    twitter: {
      card: 'summary_large_image',
      title: `${record.full_name} — Coach`,
      description,
      ...(record.headshot_url ? { images: [record.headshot_url] } : {}),
    },
  };
}

export default async function CoachPage({ params }: Props) {
  const { id } = await params;
  const record = await getStaffRecord(id);

  if (!record) notFound();

  const teamName = record.current_team_name;

  // The staff record's source namespace and row id, for the unified-profile
  // link. `nhl-<id>` covers both nhl_players and nhl_coaching_staff rows;
  // `team-<id>` covers team_members.
  //
  // The two NHL namespaces have DIFFERENT id spaces: `nhl_players.id` is a
  // big integer (8477967) and `nhl_coaching_staff.id` is a small integer
  // (118). Guessing which one the route id belongs to would resolve the
  // wrong person — or none. So the link resolves the namespace by asking
  // the loader, not by guessing. `getStaffSourceRef` tries both.
  const staffSourceRef = await getStaffSourceRef(id);

  // WS30 conversion (2026-11-13): the coach page fired NO listing_viewed
  // event, so 11,000+ coach pages were invisible to the conversion funnel
  // even though the coach pages are one of the largest listing families.
  // Fire it server-side, matching the rink / player / league pages, so the
  // funnel does not depend on client JS.
  try {
    const { trackEvent } = await import('@/lib/analytics');
    await trackEvent({
      name: 'listing_viewed',
      pathname: `/directory/coaches/${id}`,
      props: {
        listing_type: 'coach',
        listing_id: id,
        listing_slug: record.full_name ?? null,
        role: record.role ?? null,
        team_name: teamName ?? null,
      },
    });
  } catch {
    // never block the page on tracking
  }

  return (
    <>
      <main
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '2.5rem 1.25rem 4rem',
        }}
      >
        <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <Link
            href={`/directory/${ROLE_SEGMENT[record.role] || 'coaches'}`}
            style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            ← All {ROLE_SEGMENT[record.role] || 'coaches'}
          </Link>
        </nav>

        <header
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          {record.headshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.headshot_url}
              alt={record.full_name}
              width={120}
              height={120}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                background: '#1a2D45',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#1a2D45',
                color: 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {record.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: '240px' }}>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: '#fff',
                lineHeight: 1.1,
                margin: '0 0 0.5rem',
              }}
            >
              {record.full_name}
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.05rem',
                margin: '0 0 0.75rem',
              }}
            >
              {ROLE_TITLE[record.role] || record.role}
              {teamName ? ` · ${teamName}` : ''}
              {record.league_name ? ` · ${record.league_name}` : ''}
            </p>

            {/* Unified person profile (feature-flagged). Renders nothing
                unless the flag is on AND this record maps to a person with a
                canonical profile slug. */}
            <div style={{ marginBottom: '0.75rem' }}>
              <UnifiedProfileLink source={staffSourceRef.source} sourceId={staffSourceRef.sourceId} />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  background: 'rgba(255,184,28,0.15)',
                  color: '#FFB81C',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {ROLE_TITLE[record.role] || record.role}
              </span>
              {record.was_player ? (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  Former player
                </span>
              ) : null}
              {!record.is_active ? (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.5)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  Inactive
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <section
          style={{
            background: 'var(--s2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2
            style={{
              color: '#fff',
              fontSize: '1.15rem',
              margin: '0 0 0.75rem',
            }}
          >
            About {record.full_name}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
            {record.full_name} is a {ROLE_LABEL[record.role] || record.role}
            {teamName ? ` for the ${teamName}` : ''}
            {record.league_name ? ` in the ${record.league_name}` : ''}.{' '}
            {record.was_player
              ? 'They also played professionally before moving into coaching.'
              : 'Their coaching profile, team and league details are listed here for teams, agents and fans to find.'}
          </p>
        </section>

        {teamName ? (
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', margin: '0 0 0.75rem' }}>
              Team
            </h2>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                background: 'var(--s2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
              }}
            >
              {record.current_team_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={record.current_team_logo}
                  alt=""
                  width={40}
                  height={40}
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                />
              ) : null}
              <span style={{ color: '#fff', fontWeight: 600 }}>{teamName}</span>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
