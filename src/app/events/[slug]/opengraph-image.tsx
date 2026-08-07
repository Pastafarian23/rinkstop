import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'RinkStop Event';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const { data: event } = await supabase
    .from('rink_events')
    .select('title, starts_at, ends_at, banner_image_url, rink:rinks(name, city, province_state, country)')
    .eq('slug', params.slug)
    .in('status', ['published', 'cancelled', 'completed'])
    .eq('visibility', 'public')
    .single();

  if (!event) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0f172a', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 700 }}>
          Event Not Found
        </div>
      ),
      { ...size }
    );
  }

  const e: any = event;
  const startDate = new Date(e.starts_at);
  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const rinkName = e.rink?.name || 'RinkStop';
  const location = [e.rink?.city, e.rink?.province_state].filter(Boolean).join(', ');

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: '#0f172a' }}>
        {e.banner_image_url && (
          <img src={e.banner_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.95) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#38bdf8', color: '#0f172a', padding: '8px 20px', borderRadius: 999, fontSize: 24, fontWeight: 800 }}>
              RinkStop
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ color: '#7dd3fc', fontSize: 28, fontWeight: 600 }}>
              {dateStr} · {timeStr}
            </div>
            <div style={{ color: '#fff', fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
              {e.title}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 32, fontWeight: 500 }}>
              {rinkName}{location ? ` · ${location}` : ''}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
