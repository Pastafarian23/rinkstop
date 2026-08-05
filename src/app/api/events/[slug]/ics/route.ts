import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtIcs(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z');
}

function escapeIcs(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: event, error } = await supabase
    .from('rink_events')
    .select('id, slug, title, description, starts_at, ends_at, timezone, venue_name, rink:rinks(name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .single();

  if (error || !event) return new Response('Event not found', { status: 404 });

  const e = event as any;
  const rinkName = e.rink?.name || '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RinkStop//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@rinkstop.com`,
    `DTSTAMP:${fmtIcs(new Date().toISOString())}`,
    `DTSTART:${fmtIcs(e.starts_at)}`,
    `DTEND:${fmtIcs(e.ends_at)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `DESCRIPTION:${escapeIcs(e.description)}`,
    `LOCATION:${escapeIcs(e.venue_name || rinkName)}`,
    `URL:https://rinkstop.com/events/${e.slug}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(lines, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${e.slug}.ics"`,
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
