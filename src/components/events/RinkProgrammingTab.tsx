/**
 * Rink page "Programming & Events" tab — programming section.
 *
 * Server component. Renders recurring weekly programming grouped by day of
 * week. Empty state when the rink has no published programming.
 *
 * Reads from `rink_programming` (RLS: published only, anon-readable).
 */

import { supabase } from '@/lib/supabase';
import ActivityBadge, { activityMeta } from './ActivityBadge';

type Programming = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type: string;
  skill_level: string;
  gender: string;
  age_min: number | null;
  age_max: number | null;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  description: string | null;
  booking_url: string | null;
  gear_rules: string | null;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t: string): string {
  // TIME columns from Postgres come as "HH:MM:SS" or "HH:MM:SS.uuuu".
  // Normalize and emit "h:mm AM/PM".
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents == null) return 'Free';
  const dollars = cents / 100;
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)} ${currency}`;
}

function ageRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  return `Up to age ${max}`;
}

export default async function RinkProgrammingTab({ rinkId }: { rinkId: string }) {
  const { data, error } = await supabase
    .from('rink_programming')
    .select('id, day_of_week, start_time, end_time, activity_type, skill_level, gender, age_min, age_max, price_cents, currency, capacity, description, booking_url, gear_rules')
    .eq('rink_id', rinkId)
    .eq('status', 'published')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[rink-debug] RinkProgrammingTab fetch failed for rink', rinkId, error.message);
    return null;
  }

  const programming = (data || []) as Programming[];

  if (programming.length === 0) {
    return (
      <section
        style={{
          background: 'rgba(13,17,23,0.6)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '12px' }}>
          Recurring schedule
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
          This rink hasn&apos;t published its weekly schedule yet. If you work here, claim this listing to manage programming and events.
        </p>
        <a
          href="/claim-your-listing"
          style={{
            display: 'inline-block',
            background: '#38bdf8',
            color: '#0f172a',
            fontWeight: 600,
            fontSize: '14px',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Claim this listing →
        </a>
      </section>
    );
  }

  // Group by day_of_week
  const byDay = new Map<number, Programming[]>();
  for (const p of programming) {
    const existing = byDay.get(p.day_of_week) || [];
    existing.push(p);
    byDay.set(p.day_of_week, existing);
  }
  const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', margin: 0 }}>
        Recurring schedule
      </h2>
      {sortedDays.map((day) => {
        const slots = byDay.get(day) || [];
        return (
          <div
            key={day}
            style={{
              background: 'rgba(13,17,23,0.6)',
              padding: '20px 24px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {DAY_SHORT[day]}
              </span>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                {DAY_NAMES[day]}
              </h3>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                {slots.length} {slots.length === 1 ? 'session' : 'sessions'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {slots.map((slot) => {
                const meta = activityMeta(slot.activity_type);
                const age = ageRange(slot.age_min, slot.age_max);
                return (
                  <div
                    key={slot.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr auto',
                      gap: '16px',
                      alignItems: 'start',
                      paddingBottom: '12px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                        {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                      </span>
                      <span style={{ color: meta.color, fontSize: '12px' }}>
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <ActivityBadge activityType={slot.activity_type} />
                        {slot.skill_level && slot.skill_level !== 'all' && (
                          <span
                            style={{
                              fontSize: '11px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                              color: '#cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              textTransform: 'capitalize',
                            }}
                          >
                            {slot.skill_level}
                          </span>
                        )}
                        {slot.gender && slot.gender !== 'all' && (
                          <span
                            style={{
                              fontSize: '11px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                              color: '#cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              textTransform: 'capitalize',
                            }}
                          >
                            {slot.gender}
                          </span>
                        )}
                        {age && (
                          <span
                            style={{
                              fontSize: '11px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                              color: '#cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            {age}
                          </span>
                        )}
                      </div>
                      {slot.description && (
                        <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, margin: '4px 0 0' }}>
                          {slot.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span
                        style={{
                          color: slot.price_cents == null ? '#86efac' : '#fff',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}
                      >
                        {formatPrice(slot.price_cents, slot.currency)}
                      </span>
                      {slot.booking_url && (
                        <a
                          href={slot.booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            background: 'rgba(56,189,248,0.15)',
                            border: '1px solid rgba(56,189,248,0.4)',
                            color: '#7dd3fc',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                          }}
                        >
                          Book →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
