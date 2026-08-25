// src/app/dashboard/coach/schedule/page.tsx
//
// WS17 PR4 Phase 2A — Coach schedule page.
//
// Shows the authenticated coach their assigned programming slots and upcoming events.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;

const SKILL_LABELS: Record<string, string> = {
  all: 'All levels', beginner: 'Beginner', intermediate: 'Intermediate',
  advanced: 'Advanced', elite: 'Elite',
};

export default async function CoachSchedulePage() {
  const session = await auth();
  if (!session.userId) redirect('/login');

  // Get coach record
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('rink_employees')
    .select('id, rink_id, name, role, status')
    .eq('user_id', session.userId)
    .eq('role', 'coach')
    .eq('status', 'active')
    .maybeSingle();

  if (coachErr || !coach) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You are not registered as an active coach on any rink.
        </div>
      </div>
    );
  }

  // Load programming slots
  const { data: programming, error: progErr } = await supabaseAdmin
    .from('rink_programming')
    .select(`id, rink_id, day_of_week, start_time, end_time, activity_type, skill_level, gender, age_min, age_max, description, status, rink:rinks(id, name)`)
    .eq('staff_id', coach.id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  // Load upcoming events
  const { data: events, error: eventsErr } = await supabaseAdmin
    .from('rink_events')
    .select(`id, rink_id, title, description, event_type, start_time, end_time, skill_level, gender, age_group, status, rink:rinks(id, name)`)
    .eq('staff_id', coach.id)
    .gte('end_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (progErr) console.error('[coach-schedule] programming load failed', progErr);
  if (eventsErr) console.error('[coach-schedule] events load failed', eventsErr);

  // Look up rink name for the coach's rink
  const { data: coachRinkData } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('id', coach.rink_id)
    .maybeSingle();

  const progRows = (programming || []) as any[];
  const eventRows = (events || []) as any[];

  // Group programming by day
  const byDay: Record<number, typeof progRows> = {};
  for (const r of progRows) {
    if (!byDay[r.day_of_week]) byDay[r.day_of_week] = [];
    byDay[r.day_of_week].push(r);
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>My Schedule</h1>
        <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
          {coach.name} · {coachRinkData?.name || 'Rink employee'}
        </p>
      </div>

      {progRows.length === 0 && eventRows.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>No upcoming sessions or events assigned to you.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {progRows.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Weekly Programming</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {DAYS.map((dayName, dayIdx) => {
                  const rows = byDay[dayIdx] || [];
                  if (rows.length === 0) return null;
                  return (
                    <div key={dayIdx} style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{dayName}</h3>
                      {rows.map((r: any) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                          <span style={{ color: '#38BDF8', fontSize: '0.9rem', fontWeight: 600, minWidth: 80 }}>
                            {r.start_time?.slice(0,5)}–{r.end_time?.slice(0,5)}
                          </span>
                          <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{r.activity_type?.replace(/_/g, ' ')}</span>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {SKILL_LABELS[r.skill_level] || r.skill_level} · {r.gender !== 'all' ? r.gender : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {eventRows.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Upcoming Events</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {eventRows.map((ev: any) => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                        {new Date(ev.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(ev.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {' – '}
                        {new Date(ev.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {ev.rink ? ` · ${ev.rink.name}` : ''}
                      </div>
                    </div>
                    <span style={{ background: 'rgba(56,189,248,0.15)', color: '#7DD3FC', padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 }}>
                      {ev.event_type}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
