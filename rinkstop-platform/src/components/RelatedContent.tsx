'use client';

interface RelatedItem {
  id: string;
  name: string;
  slug: string;
  type: 'team' | 'rink' | 'league' | 'player';
  logo_url?: string;
  city?: string;
  country?: string;
}

interface RelatedContentProps {
  title?: string;
  items: RelatedItem[];
  emptyMessage?: string;
  layout?: 'row' | 'grid';
}

const TYPE_COLORS: Record<string, string> = {
  team: 'rgba(200,16,46,0.15)',
  rink: 'rgba(20,184,166,0.12)',
  league: 'rgba(255,184,28,0.12)',
  player: 'rgba(100,150,255,0.12)',
};

const TYPE_TEXT: Record<string, string> = {
  team: 'Team',
  rink: 'Rink',
  league: 'League',
  player: 'Player',
};

const TYPE_HREF: Record<string, string> = {
  team: '/directory/teams',
  rink: '/directory/rinks',
  league: '/directory/leagues',
  player: '/directory/players',
};

export default function RelatedContent({ title, items, emptyMessage, layout = 'row' }: RelatedContentProps) {
  if (!items || items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', fontStyle: 'italic' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {title && (
        <h3 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.125rem',
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.05em',
          marginBottom: '0.875rem',
          textTransform: 'uppercase',
        }}>
          {title}
        </h3>
      )}

      <div style={
        layout === 'grid'
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }
          : { display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }
      }>
        {items.map(item => (
          <a
            key={item.id}
            href={`${TYPE_HREF[item.type]}/${item.slug}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              minWidth: layout === 'grid' ? 0 : '200px',
              width: layout === 'grid' ? '100%' : '200px',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.875rem 1rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
              {item.logo_url ? (
                <img
                  src={item.logo_url}
                  alt=""
                  style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0, borderRadius: '4px' }}
                />
              ) : (
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '4px',
                  background: 'var(--s3)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                }}>
                  {item.type === 'team' ? '🏒' : item.type === 'rink' ? '❄️' : item.type === 'league' ? '🏆' : '🧑'}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.name}
                </p>
                {item.city && (
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.15rem 0.4rem',
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '3px',
                background: TYPE_COLORS[item.type] || 'rgba(255,255,255,0.08)',
                color: item.type === 'team' ? 'var(--red)' : item.type === 'rink' ? '#2dd4bf' : item.type === 'league' ? 'var(--gold)' : '#93c5fd',
              }}>
                {TYPE_TEXT[item.type] || item.type}
              </span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                View →
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}