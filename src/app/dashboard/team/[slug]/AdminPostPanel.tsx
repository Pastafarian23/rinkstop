'use client';

import { useState, useEffect } from 'react';

type PostType = 'news' | 'result' | 'schedule';

interface Props {
  teamSlug: string;
  teamId: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.75)',
  marginBottom: '0.3rem',
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'rgba(255,255,255,0.4)',
  marginTop: '0.2rem',
};

const TABS: { key: PostType; label: string; icon: string; desc: string }[] = [
  { key: 'news', label: 'News', icon: '📰', desc: 'Post an update, announcement, or recap' },
  { key: 'result', label: 'Result', icon: '🏒', desc: 'Record a game result (immutable — delete and re-post to fix)' },
  { key: 'schedule', label: 'Schedule', icon: '📅', desc: 'Add a game, practice, or tournament' },
];

// ── Section wrapper ──────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <h3
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.1rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{description}</p>
    </div>
  );
}

// ── News form ──────────────────────────────────────────────────────────────────

function NewsForm({ teamSlug }: { teamSlug: string }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'news', title: title.trim(), body: body.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return; }
      setTitle('');
      setBody('');
      setMsg({ ok: true, text: 'Posted! Visible on the public profile.' });
    } catch { setMsg({ ok: false, text: 'Network error' }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div>
        <label style={labelStyle}>Headline *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. Season opener against Cebu Ice Dragons — 4-2 win" style={inputStyle} />
        <div style={hintStyle}>{title.length}/160</div>
      </div>
      <div>
        <label style={labelStyle}>Post body *</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} required maxLength={8000} placeholder="Share a recap, announcement, or update..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        <div style={hintStyle}>{body.length}/8,000</div>
      </div>
      {msg && (
        <div style={{ padding: '0.5rem 0.75rem', background: msg.ok ? 'rgba(20,184,166,0.10)' : 'rgba(200,16,46,0.10)', border: `1px solid ${msg.ok ? 'rgba(20,184,166,0.35)' : 'rgba(200,16,46,0.35)'}`, borderRadius: 6, fontSize: '0.8rem', color: msg.ok ? '#14B8A6' : '#FF6B7A' }}>
          {msg.ok ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}
      <button type="submit" disabled={saving || !title.trim() || !body.trim()} style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', background: saving || !title.trim() || !body.trim() ? 'rgba(20,184,166,0.3)' : '#14B8A6', color: '#041E42', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Posting…' : 'Post news'}
      </button>
    </form>
  );
}

// ── Result form ────────────────────────────────────────────────────────────────

function ResultForm({ teamSlug }: { teamSlug: string }) {
  const [gameDate, setGameDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away' | 'neutral'>('home');
  const [ourScore, setOurScore] = useState('');
  const [theirScore, setTheirScore] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameDate || !opponent.trim() || ourScore === '' || theirScore === '') return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'result',
          game_date: gameDate,
          opponent: opponent.trim(),
          home_away: homeAway,
          our_score: parseInt(ourScore),
          their_score: parseInt(theirScore),
          notes: notes.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return; }
      setOpponent('');
      setOurScore('');
      setTheirScore('');
      setNotes('');
      setMsg({ ok: true, text: `Result recorded: ${d.data.our_score}-${d.data.their_score} (${d.data.outcome}). Visible on the public profile.` });
    } catch { setMsg({ ok: false, text: 'Network error' }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Date *</label>
          <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Home / Away</label>
          <select value={homeAway} onChange={e => setHomeAway(e.target.value as any)} style={inputStyle}>
            <option value="home">Home</option>
            <option value="away">Away</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Opponent *</label>
        <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} required maxLength={120} placeholder="e.g. Cebu Ice Dragons" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
        <div>
          <label style={labelStyle}>Your score *</label>
          <input type="number" value={ourScore} onChange={e => setOurScore(e.target.value)} required min={0} max={99} placeholder="0" style={inputStyle} />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', paddingTop: '1.2rem' }}>–</div>
        <div>
          <label style={labelStyle}>Opponent score *</label>
          <input type="number" value={theirScore} onChange={e => setTheirScore(e.target.value)} required min={0} max={99} placeholder="0" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Game notes <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>(optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} placeholder="OT/SO, empty net, notable players..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {msg && (
        <div style={{ padding: '0.5rem 0.75rem', background: msg.ok ? 'rgba(20,184,166,0.10)' : 'rgba(200,16,46,0.10)', border: `1px solid ${msg.ok ? 'rgba(20,184,166,0.35)' : 'rgba(200,16,46,0.35)'}`, borderRadius: 6, fontSize: '0.8rem', color: msg.ok ? '#14B8A6' : '#FF6B7A' }}>
          {msg.ok ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}
      <button type="submit" disabled={saving || !gameDate || !opponent.trim() || ourScore === '' || theirScore === ''} style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', background: saving || !gameDate || !opponent.trim() || ourScore === '' || theirScore === '' ? 'rgba(20,184,166,0.3)' : '#14B8A6', color: '#041E42', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Saving…' : 'Record result'}
      </button>
    </form>
  );
}

// ── Schedule form ──────────────────────────────────────────────────────────────

function ScheduleForm({ teamSlug }: { teamSlug: string }) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [opponent, setOpponent] = useState('');
  const [kind, setKind] = useState<'game' | 'practice' | 'tournament' | 'meeting' | 'other'>('game');
  const [venue, setVenue] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away' | 'neutral'>('home');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt || !kind) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'schedule',
          scheduled_at: new Date(scheduledAt).toISOString(),
          opponent: opponent.trim() || null,
          kind,
          venue: venue.trim() || null,
          home_away: kind === 'practice' || kind === 'meeting' || kind === 'other' ? null : homeAway,
          notes: notes.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return; }
      setOpponent('');
      setVenue('');
      setNotes('');
      setMsg({ ok: true, text: 'Scheduled. Visible on the public profile.' });
    } catch { setMsg({ ok: false, text: 'Network error' }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Date & time *</label>
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Type *</label>
          <select value={kind} onChange={e => setKind(e.target.value as any)} style={inputStyle}>
            <option value="game">🏒 Game</option>
            <option value="practice">🎯 Practice</option>
            <option value="tournament">🏆 Tournament</option>
            <option value="meeting">📋 Meeting</option>
            <option value="other">📌 Other</option>
          </select>
        </div>
      </div>
      {kind === 'game' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Opponent</label>
            <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} maxLength={120} placeholder="e.g. Manila Ice Breakers" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Home / Away</label>
            <select value={homeAway} onChange={e => setHomeAway(e.target.value as any)} style={inputStyle}>
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
      )}
      <div>
        <label style={labelStyle}>Venue / Location <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>(optional)</span></label>
        <input type="text" value={venue} onChange={e => setVenue(e.target.value)} maxLength={200} placeholder="e.g. Cebu Ice Arena, IT Park" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>(optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} placeholder="Gear reminder, entry fee, parking..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {msg && (
        <div style={{ padding: '0.5rem 0.75rem', background: msg.ok ? 'rgba(20,184,166,0.10)' : 'rgba(200,16,46,0.10)', border: `1px solid ${msg.ok ? 'rgba(20,184,166,0.35)' : 'rgba(200,16,46,0.35)'}`, borderRadius: 6, fontSize: '0.8rem', color: msg.ok ? '#14B8A6' : '#FF6B7A' }}>
          {msg.ok ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}
      <button type="submit" disabled={saving || !scheduledAt} style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', background: saving || !scheduledAt ? 'rgba(20,184,166,0.3)' : '#14B8A6', color: '#041E42', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Saving…' : 'Add to schedule'}
      </button>
    </form>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function AdminPostPanel({ teamSlug, teamId }: Props) {
  const [activeTab, setActiveTab] = useState<PostType>('news');

  const t = TABS.find((t) => t.key === activeTab)!;

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.25rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.2rem',
            }}
          >
            Public Posts
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            Updates appear on your public team profile. Players and parents can view them without logging in.
          </p>
        </div>
        <a
          href={`/directory/teams/${encodeURIComponent(teamSlug)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.35rem 0.75rem',
            background: 'rgba(20,184,166,0.08)',
            border: '1px solid rgba(20,184,166,0.25)',
            borderRadius: 6,
            color: '#14B8A6',
            textDecoration: 'none',
            fontSize: '0.72rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          ↗ View public profile
        </a>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? '#FFB81C' : 'transparent'}`,
              color: activeTab === tab.key ? '#FFB81C' : 'rgba(255,255,255,0.5)',
              borderRadius: 0,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
            }}
          >
            <span style={{ marginRight: '0.3rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active form */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '1.25rem 1.5rem',
        }}
      >
        <SectionHeader icon={t.icon} title={t.label} description={t.desc} />
        {activeTab === 'news' && <NewsForm teamSlug={teamSlug} />}
        {activeTab === 'result' && <ResultForm teamSlug={teamSlug} />}
        {activeTab === 'schedule' && <ScheduleForm teamSlug={teamSlug} />}
      </div>
    </section>
  );
}