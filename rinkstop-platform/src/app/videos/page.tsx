// src/app/videos/page.tsx — Hockey Highlights Hub
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Highlight {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  date: string;
  league_id: number;
  league_name: string;
  country_code: string;
  team_ids?: number[];
  tags?: string[];
  verified: boolean;
}

async function getHighlights(): Promise<Highlight[]> {
  const { data } = await supabase
    .from('highlightly_highlights')
    .select('*')
    .order('date', { ascending: false })
    .limit(50);
  return data || [];
}

async function getLeaguesWithHighlights() {
  const { data } = await supabase
    .from('highlightly_highlights')
    .select('league_id, league_name');
  
  const leagues: Record<string, string> = {};
  for (const h of (data || [])) {
    leagues[h.league_id] = h.league_name;
  }
  return Object.entries(leagues).map(([id, name]) => ({ id, name }));
}

export default async function VideosPage() {
  const [highlights, leagues] = await Promise.all([
    getHighlights(),
    getLeaguesWithHighlights(),
  ]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Videos</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="label">Watch</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY HIGHLIGHTS
        </h1>
        <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          The best goals, saves, and plays from leagues around the world.
        </p>
      </div>

      {/* League Filter */}
      {leagues.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/videos" style={{ 
            padding: '0.35rem 0.75rem', 
            background: '#041E42', 
            color: '#fff', 
            borderRadius: '4px', 
            fontSize: '0.75rem',
            textDecoration: 'none'
          }}>All</Link>
          {leagues.map(l => (
            <Link key={l.id} href={`/videos?league=${l.id}`} style={{
              padding: '0.35rem 0.75rem',
              background: '#1a1a1a',
              color: '#888',
              borderRadius: '4px',
              fontSize: '0.75rem',
              textDecoration: 'none'
            }}>{l.name}</Link>
          ))}
        </div>
      )}

      {/* Highlights Grid */}
      {highlights.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
          <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Coming Soon</h2>
          <p>Video highlights are being added from leagues around the world.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Check back soon — we&apos;re building something great.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1rem' 
        }}>
          {highlights.map(h => (
            <div key={h.id} style={{ 
              background: '#1a1a1a', 
              borderRadius: '8px', 
              overflow: 'hidden',
              border: '1px solid #333'
            }}>
              {/* Thumbnail */}
              <div style={{ 
                aspectRatio: '16/9', 
                background: '#041E42', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative'
              }}>
                {h.thumbnail_url ? (
                  <img src={h.thumbnail_url} alt={h.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '2rem' }}>🎬</div>
                )}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(4,30,66,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  cursor: 'pointer'
                }}>▶</div>
              </div>
              
              {/* Info */}
              <div style={{ padding: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', color: '#fff', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {h.title}
                </h3>
                {h.description && (
                  <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
                    {h.description.slice(0, 80)}{h.description.length > 80 ? '...' : ''}
                  </p>
                )}
                <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', gap: '0.75rem' }}>
                  <span>{h.league_name}</span>
                  <span>{h.date?.slice(0, 10)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Newsletter CTA */}
      <div style={{ 
        marginTop: '3rem', 
        background: 'linear-gradient(135deg, #041E42, #0a2a5a)', 
        borderRadius: '8px', 
        padding: '1.5rem 2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Get Highlights in Your Inbox</h3>
        <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Weekly recap of the best goals and saves from around the hockey world.
        </p>
        <Link href="/newsletter" style={{
          display: 'inline-block',
          padding: '0.6rem 1.5rem',
          background: '#fff',
          color: '#041E42',
          borderRadius: '4px',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none'
        }}>Subscribe Free</Link>
      </div>

    </div>
  );
}
