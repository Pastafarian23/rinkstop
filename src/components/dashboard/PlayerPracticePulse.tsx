import { supabaseAdmin } from '@/lib/supabase';

export interface PracticePlanRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  focus: string | null;
  duration_min: number | null;
  skill_level: string | null;
  age_min: number | null;
  age_max: number | null;
}

export interface ActiveSessionRow {
  id: string;
  practice_plan_id: string;
  status: string;
  started_at: string;
}

export interface PracticePulseData {
  suggestions: PracticePlanRow[];          // 1-3 plans the user hasn't started yet
  activeSession: ActiveSessionRow | null; // currently in-progress
  weeklyCount: number;                    // completed in last 7 days
  monthlyCount: number;                   // completed in last 30 days
  loaded: boolean;
}

/**
 * Loads the data the PlayerPracticePulse card needs.
 *
 * Age-based filter is best-effort — we don't store the player's birth date
 * on profiles, so the dashboard shows plans without an age range OR all plans
 * if we can't infer. Coach-specific filtering (skill_level) happens client-side
 * after a future "what level are you?" prompt.
 *
 * Always returns the same shape — failures degrade to loaded:false so the
 * card renders a polite CTA instead of breaking the dashboard.
 */
export async function loadPracticePulseData(userId: string): Promise<PracticePulseData> {
  const out: PracticePulseData = {
    suggestions: [],
    activeSession: null,
    weeklyCount: 0,
    monthlyCount: 0,
    loaded: false,
  };

  // 2026-07-31 (Arnel-flagged dashboard perf pass): the previous serial chain
  // stacked 5 queries one-after-the-other. The 4 read-mostly queries
  // (active session, week count, month count, started plan IDs) are all
  // independent — they run in parallel via Promise.all. The published
  // plans fetch is gated on the started plan IDs (we need excludeIds), so
  // it runs after the parallel batch with the dedup applied.

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [activeRes, weekRes, monthRes, startedRes] = await Promise.allSettled([
      // 1. Active session (status='started', most recent)
      supabaseAdmin
        .from('player_practice_sessions')
        .select('id, practice_plan_id, status, started_at')
        .eq('user_id', userId)
        .eq('status', 'started')
        .order('started_at', { ascending: false })
        .limit(1),
      // 2a. Weekly completed count
      supabaseAdmin
        .from('player_practice_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', sevenDaysAgo),
      // 2b. Monthly completed count
      supabaseAdmin
        .from('player_practice_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo),
      // 3. Plans the user has touched (started or completed) — for excludeIds.
      supabaseAdmin
        .from('player_practice_sessions')
        .select('practice_plan_id')
        .eq('user_id', userId)
        .in('status', ['started', 'completed']),
    ]);

    if (activeRes.status === 'fulfilled') {
      const activeRows = activeRes.value.data || [];
      out.activeSession = activeRows[0] || null;
    }
    if (weekRes.status === 'fulfilled') {
      out.weeklyCount = weekRes.value.count ?? 0;
    }
    if (monthRes.status === 'fulfilled') {
      out.monthlyCount = monthRes.value.count ?? 0;
    }

    const excludeIds = new Set<string>();
    if (startedRes.status === 'fulfilled') {
      for (const r of (startedRes.value.data || []) as any[]) {
        if (r.practice_plan_id) excludeIds.add(r.practice_plan_id);
      }
    }

    // 4. Published plans, then filter by excludeIds.
    try {
      const { data: plans } = await supabaseAdmin
        .from('practice_plans')
        .select('id, slug, title, summary, focus, duration_min, skill_level, age_min, age_max')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      out.suggestions = (plans || [])
        .filter((p: any) => !excludeIds.has(p.id))
        .slice(0, 3);
    } catch { /* keep empty suggestions */ }

    out.loaded = true;
  } catch (e) {
    console.error('[dashboard] practice pulse data load failed:', e);
    // Fall through with loaded:false — caller renders the empty/CTA state.
  }

  return out;
}

interface PlayerPracticePulseProps {
  data: PracticePulseData;
}

const cardStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
};

const headlineStyle: React.CSSProperties = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '1.25rem',
  color: '#fff',
  letterSpacing: '0.04em',
  margin: 0,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.6rem 0.75rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  fontSize: '0.875rem',
  color: '#e5e5e5',
};

const statBoxStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.25rem',
  fontSize: '0.8rem',
  color: 'rgba(255,255,255,0.55)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  background: '#1f6feb',
  color: '#fff',
  borderRadius: 6,
  textDecoration: 'none',
  fontSize: '0.8rem',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};

export default function PlayerPracticePulse({ data }: PlayerPracticePulseProps) {
  if (!data.loaded) {
    return (
      <section style={cardStyle}>
        <h3 style={headlineStyle}>Your Practice</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
          Pick a drill and start tracking your reps.
        </p>
        <a href="/directory/practice-plans" style={buttonStyle}>Browse practice plans →</a>
      </section>
    );
  }

  return (
    <section style={cardStyle} aria-label="Your practice this week">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={headlineStyle}>Your Practice</h3>
        <div style={statBoxStyle}>
          <span><strong style={{ color: '#fff' }}>{data.weeklyCount}</strong> this week</span>
          <span><strong style={{ color: '#fff' }}>{data.monthlyCount}</strong> this month</span>
        </div>
      </div>

      {data.activeSession && (
        <div style={rowStyle}>
          <span>Session in progress</span>
          <form method="POST" action="/api/dashboard/practice-session" style={{ margin: 0 }}>
            <input type="hidden" name="session_id" value={data.activeSession.id} />
            <input type="hidden" name="action" value="complete" />
            <button type="submit" style={buttonStyle}>Mark done</button>
          </form>
        </div>
      )}

      {data.suggestions.length === 0 ? (
        <div style={{ ...rowStyle, justifyContent: 'flex-start' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>
            You&rsquo;ve started every published plan. Browse the full library or create your own.
          </span>
          <a href="/directory/practice-plans" style={buttonStyle}>All plans →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.suggestions.map((plan) => (
            <div key={plan.id} style={rowStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{plan.title}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                  {plan.focus || 'All-purpose'} · {plan.duration_min ?? '—'} min
                </span>
              </div>
              <form method="POST" action="/api/dashboard/practice-session" style={{ margin: 0 }}>
                <input type="hidden" name="practice_plan_id" value={plan.id} />
                <input type="hidden" name="action" value="start" />
                <button type="submit" style={buttonStyle}>Start →</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
