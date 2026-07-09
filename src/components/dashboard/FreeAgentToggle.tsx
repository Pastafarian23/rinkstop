import { supabaseAdmin } from '@/lib/supabase';

export interface FreeAgentProfile {
  status: 'off' | 'looking' | 'sub_needed_today';
  position: string | null;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  radius_km: number | null;
  notes: string | null;
  show_location: boolean;
  updated_at: string | null;
}

export const EMPTY_FREE_AGENT: FreeAgentProfile = {
  status: 'off',
  position: null,
  skill_level: null,
  radius_km: null,
  notes: null,
  show_location: false,
  updated_at: null,
};

/**
 * Loads the calling user's free-agent fields.
 * Always returns a FreeAgentProfile shape — failures degrade to EMPTY_FREE_AGENT.
 */
export async function loadFreeAgentProfile(userId: string): Promise<FreeAgentProfile> {
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('free_agent_status, free_agent_position, free_agent_skill_level, free_agent_radius_km, free_agent_notes, free_agent_show_location, free_agent_updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return EMPTY_FREE_AGENT;
    return {
      status: (data.free_agent_status ?? 'off') as FreeAgentProfile['status'],
      position: data.free_agent_position ?? null,
      skill_level: (data.free_agent_skill_level ?? null) as FreeAgentProfile['skill_level'],
      radius_km: data.free_agent_radius_km ?? null,
      notes: data.free_agent_notes ?? null,
      show_location: data.free_agent_show_location ?? false,
      updated_at: data.free_agent_updated_at ?? null,
    };
  } catch (e) {
    console.error('[dashboard] free-agent profile load failed:', e);
    return EMPTY_FREE_AGENT;
  }
}

interface FreeAgentToggleProps {
  profile: FreeAgentProfile;
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

const helperText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.78rem',
  margin: 0,
  lineHeight: 1.4,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  fontSize: '0.85rem',
  color: '#e5e5e5',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.45rem 0.9rem',
  background: '#1f6feb',
  color: '#fff',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.8rem',
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
};

const STATUS_LABEL: Record<FreeAgentProfile['status'], string> = {
  off: 'Off',
  looking: 'Looking for a team',
  sub_needed_today: 'Need a sub today',
};

const STATUS_COLOR: Record<FreeAgentProfile['status'], string> = {
  off: 'rgba(255,255,255,0.45)',
  looking: 'rgba(20,184,166,0.9)',
  sub_needed_today: '#FFB81C',
};

export default function FreeAgentToggle({ profile }: FreeAgentToggleProps) {
  const currentLabel = STATUS_LABEL[profile.status];
  const currentColor = STATUS_COLOR[profile.status];

  return (
    <section style={cardStyle} aria-label="Free agent status">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={headlineStyle}>Free Agent Status</h3>
          <p style={helperText}>
            Turn this on to be findable by captains in your area. Visible to anyone on /directory/free-agents. Off by default.
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', color: currentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ● {currentLabel}
        </div>
      </div>

      <form
        method="POST"
        action="/api/free-agent"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
      >
        <div style={rowStyle}>
          <label htmlFor="fa-status" style={{ flex: '0 0 130px' }}>Status</label>
          <select
            id="fa-status"
            name="status"
            defaultValue={profile.status}
            style={{
              flex: 1,
              padding: '0.4rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.85rem',
            }}
          >
            <option value="off">Off (not visible)</option>
            <option value="looking">Looking for a team</option>
            <option value="sub_needed_today">Need a sub today</option>
          </select>
        </div>

        <div style={rowStyle}>
          <label htmlFor="fa-position" style={{ flex: '0 0 130px' }}>Position</label>
          <input
            id="fa-position"
            name="position"
            type="text"
            maxLength={80}
            defaultValue={profile.position ?? ''}
            placeholder="e.g. Center, Goalie, RW"
            style={{
              flex: 1,
              padding: '0.4rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={rowStyle}>
          <label htmlFor="fa-skill" style={{ flex: '0 0 130px' }}>Skill level</label>
          <select
            id="fa-skill"
            name="skill_level"
            defaultValue={profile.skill_level ?? ''}
            style={{
              flex: 1,
              padding: '0.4rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.85rem',
            }}
          >
            <option value="">— Not specified —</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        <div style={rowStyle}>
          <label htmlFor="fa-radius" style={{ flex: '0 0 130px' }}>Radius (km)</label>
          <input
            id="fa-radius"
            name="radius_km"
            type="number"
            min={1}
            max={500}
            defaultValue={profile.radius_km ?? ''}
            placeholder="e.g. 25"
            style={{
              flex: 1,
              padding: '0.4rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
          <label htmlFor="fa-notes" style={{ marginBottom: 4 }}>Notes (optional, max 500 chars)</label>
          <textarea
            id="fa-notes"
            name="notes"
            maxLength={500}
            rows={2}
            defaultValue={profile.notes ?? ''}
            placeholder="e.g. Available weekday evenings, can travel up to 30 km"
            style={{
              padding: '0.5rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={rowStyle}>
          <label htmlFor="fa-loc" style={{ flex: 1 }}>
            Show my approximate location in directory
          </label>
          <input
            id="fa-loc"
            name="show_location"
            type="checkbox"
            value="true"
            defaultChecked={profile.show_location}
            style={{ width: 18, height: 18 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <a
            href="/directory/free-agents"
            style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            See who's near you →
          </a>
          <button type="submit" style={btnPrimary}>Save</button>
        </div>
      </form>
    </section>
  );
}
