// src/components/news/NewsTeamsChips.tsx
// Server component — Block A. Renders up to 2 team chips after the
// article lede. Renders nothing if no teams are linked.
import Link from 'next/link';
import type { NewsTeam } from '@/lib/news-related';

interface Props {
  teams: NewsTeam[];
}

export default function NewsTeamsChips({ teams }: Props) {
  if (teams.length === 0) return null;

  return (
    <div
      aria-label="Teams in this article"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        margin: '0 0 1.5rem 0',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#666',
          marginRight: '0.25rem',
        }}
      >
        Teams
      </span>
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/directory/teams/${team.slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            background: '#041E42',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '999px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'border-color 0.18s, transform 0.18s',
          }}
        >
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.logo_url}
              alt=""
              width={20}
              height={20}
              style={{ borderRadius: '50%', background: '#fff' }}
            />
          ) : (
            <span aria-hidden style={{ fontSize: '0.9rem' }}>🏒</span>
          )}
          <span>{team.name}</span>
          {team.league_name && (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#FFB81C',
                fontWeight: 500,
                marginLeft: '0.15rem',
              }}
            >
              · {team.league_name}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
