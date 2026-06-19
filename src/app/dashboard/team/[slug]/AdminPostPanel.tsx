'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type PostType = 'news' | 'result' | 'schedule';

interface NewsPost { id: string; title: string; body?: string; is_published: boolean; published_at?: string; created_at: string; }
interface ResultPost { id: string; game_date: string; opponent: string; home_away?: string; our_score: number; their_score: number; outcome: string; notes?: string; created_at: string; }
interface SchedulePost { id: string; scheduled_at: string; opponent?: string; kind: string; venue?: string; home_away?: string; notes?: string; is_cancelled: boolean; created_at: string; }

interface Props { teamSlug: string; teamId: string; }

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.7rem',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6, color: '#fff', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: '0.3rem',
};
const hintStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' };
const sectionBg: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '1.25rem 1.5rem',
};

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel, onConfirm, onCancel, danger = false,
}: {
  title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '1.5rem', maxWidth: 380, width: '100%',
      }}>
        <h3 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: '0 0 1.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '0.5rem 1rem', background: danger ? '#C8102E' : '#14B8A6', border: 'none', borderRadius: 6, color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Post list helpers ─────────────────────────────────────────────────────────

function fmtDate(s: string | undefined, wantTime = false): string {
  if (!s) return '';
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return wantTime
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function outcomeBadge(outcome: string): React.ReactNode {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    W: { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6', label: 'W' },
    L: { bg: 'rgba(200,16,46,0.15)', color: '#FF6B7A', label: 'L' },
    T: { bg: 'rgba(255,184,28,0.15)', color: '#FFB81C', label: 'T' },
  };
  const s = map[outcome] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: outcome };
  return (
    <span style={{ display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: 4, background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>
      {s.label}
    </span>
  );
}

function kindIcon(kind: string): string {
  const m: Record<string, string> = { game: '🏒', practice: '🎯', tournament: '🏆', meeting: '📋', other: '📌' };
  return m[kind] ?? '📌';
}

function kindLabel(kind: string): string {
  const m: Record<string, string> = { game: 'Game', practice: 'Practice', tournament: 'Tournament', meeting: 'Meeting', other: 'Other' };
  return m[kind] ?? kind;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { key: PostType; label: string; icon: string; desc: string }[] = [
  { key: 'news', label: 'News', icon: '📰', desc: 'Post an update, announcement, or recap — written by your team, for your audience.' },
  { key: 'result', label: 'Results', icon: '🏒', desc: 'Record a game result. Results are permanent — delete and re-add to correct a mistake.' },
  { key: 'schedule', label: 'Schedule', icon: '📅', desc: 'Add games, practices, tournaments, and other events to your public schedule.' },
];

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.1rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          {title}
        </h3>
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{description}</p>
    </div>
  );
}

// ── Form shared row styles ────────────────────────────────────────────────────

function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>{children}</div>;
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>{children}</div>;
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

// ── News form ─────────────────────────────────────────────────────────────────

interface NewsFormProps { teamSlug: string; post?: NewsPost | null; onSaved: () => void; onCancel: () => void; }

function NewsForm({ teamSlug, post, onSaved, onCancel }: NewsFormProps) {
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true); setMsg(null);
    const method = post ? 'PATCH' : 'POST';
    const payload: Record<string, unknown> = post
      ? { type: 'news', id: post.id, title: title.trim(), body: body.trim() }
      : { type: 'news', title: title.trim(), body: body.trim() };
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return; }
      onSaved();
    } catch { setMsg({ ok: false, text: 'Network error' }); }
    finally { setSaving(false); }
  }

  const disabled = saving || !title.trim() || !body.trim();
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <Field label="Headline *" hint={`${title.length}/160`}>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. Season opener against Cebu Ice Dragons — 4-2 win" style={inputStyle} />
      </Field>
      <Field label="Post body *" hint={`${body.length}/8,000`}>
        <textarea value={body} onChange={e => setBody(e.target.value)} required maxLength={8000} placeholder="Share a recap, announcement, or update..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>
      {msg && <StatusMsg {...msg} />}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={disabled} style={{ padding: '0.55rem 1.25rem', background: disabled ? 'rgba(20,184,166,0.3)' : '#14B8A6', color: '#041E42', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 700, cursor: disabled ? 'wait' : 'pointer' }}>
          {saving ? 'Saving…' : post ? 'Save changes' : 'Post news'}
        </button>
        {post && (
          <button type="button" onClick={onCancel} style={{ padding: '0.55rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Result form ────────────────────────────────────────────────────────────────

interface ResultFormProps { teamSlug: string; onSaved: () => void; }

function ResultForm({ teamSlug, onSaved }: ResultFormProps) {
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
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'result', game_date: gameDate, opponent: opponent.trim(), home_away: homeAway,
          our_score: parseInt(ourScore), their_score: parseInt(theirScore), notes: notes.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return; }
      setOpponent(''); setOurScore(''); setTheirScore(''); setNotes('');
      setMsg({ ok: true, text: `Recorded: ${d.data.our_score}–${d.data.their_score} (${d.data.outcome}). Visible on your public profile.` });
      onSaved();
    } catch { setMsg({ ok: false, text: 'Network error' }); }
    finally { setSaving(false); }
  }

  const disabled = saving || !gameDate || !opponent.trim() || ourScore === '' || theirScore === '';
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <TwoCol>
        <Field label="Date *"><input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} required style={inputStyle} /></Field>
        <Field label="Home / Away">
          <select value={homeAway} onChange={e => setHomeAway(e.target.value as any)} style={inputStyle}>
            <option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option>
          </select>
        </Field>
      </TwoCol>
      <Field label="Opponent *"><input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} required maxLength={120} placeholder="e.g. Cebu Ice Dragons" style={inputStyle} /></Field>
      <TwoCol>
        <Field label="Your score *"><input type="number" value={ourScore} onChange={e => setOurScore(e.target.value)} required min={0} max={99} placeholder="0" style={inputStyle} /></Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '0.7rem', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem' }}>–</div>
        <Field label="Opponent score *"><input type="number" value={theirScore} onChange={e => setTheirScore(e.target.value)} required min={0} max={99} placeholder="0" style={inputStyle} /></Field>
      </TwoCol>
      <Field label="Game notes (optional)" hint="OT/SO, empty net, notable players…">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </Field>
      {msg && <StatusMsg {...msg} />}
      <button type="submit" disabled={disabled} style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem', background: disabled ? 'rgba(20,184,166,0.3)' : '#14B8A6', color: '#041E42', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 700, cursor: disabled ? 'wait' : 'pointer' }}>
        {saving ? 'Saving…' : 'Record result'}
      </button>
    </form>
  );
}

// ── Schedule form ─────────────────────────────────────────────────────────────

interface ScheduleFormProps { teamSlug: string; post?: SchedulePost | null; onSaved: () => void; onCancel: () => void; }

function ScheduleForm({ teamSlug, post, onSaved, onCancel }: ScheduleFormProps) {
  const [scheduledAt, setScheduledAt] = useState(post ? post.scheduled_at.slice(0, 16) : '');
  const [opponent, setOpponent] = useState(post?.opponent ?? '');
  const [kind, setKind] = useState<string>(post?.kind ?? 'game');
  const [venue, setVenue] = useState(post?.venue ?? '');
  const [homeAway, setHomeAway] = useState<'home' | 'away' | 'neutral'>((post?.home_away ?? 'home') as 'home' | 'away' | 'neutral');
  const [notes, setNotes] = useState(post?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt || !kind) return;
    setSaving(true); setMsg(null);
    const method = post ? 'PATCH' : 'POST';
    const payload: Record<string, unknown> = post
      ? { type: 'schedule', id: post.id, scheduled_at: new Date(scheduledAt).toISOString(), opponent: opponent.trim() || null, kind, venue: venue.trim() || null, home_away: kind === 'practice' || kind === 'meeting' || kind === 'other' ? null : homeAway, notes: notes.trim() || null }
      : { type: 'schedule', scheduled_at: new Date(scheduledAt).toISOString(), opponent: opponent.trim() || null, kind, venue: venue.trim() || null, home_away: kind === 'practice' || kind === 'meeting' || kind === 'other' ? null : homeAway, notes: notes.trim() || null };
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? 'Save failed' }); return; }
      onSaved();
    } catch { setMsg({ ok: false, text: 'Network error' }); }
    finally { setSaving(false); }
  }

  const isPracticeOrMeeting = kind === 'practice' || kind === 'meeting' || kind === 'other';
  const disabled = saving || !scheduledAt;
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <TwoCol>
        <Field label="Date & time *"><input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required style={inputStyle} /></Field>
        <Field label="Type *">
          <select value={kind} onChange={e => setKind(e.target.value)} style={inputStyle}>
            <option value="game">🏒 Game</option><option value="practice">🎯 Practice</option><option value="tournament">🏆 Tournament</option><option value="meeting">📋 Meeting</option><option value="other">📌 Other</option>
          </select>
        </Field>
      </TwoCol>
      {kind === 'game' && (
        <TwoCol>
          <Field label="Opponent"><input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} maxLength={120} placeholder="e.g. Manila Ice Breakers" style={inputStyle} /></Field>
          <Field label="Home / Away">
            <select value={homeAway} onChange={e => setHomeAway(e.target.value as any)} style={inputStyle}>
              <option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option>
            </select>
          </Field>
        </TwoCol>
      )}
      <Field label="Venue / Location (optional)"><input type="text" value={venue} onChange={e => setVenue(e.target.value)} maxLength={200} placeholder="e.g. Cebu Ice Arena, IT Park" style={inputStyle} /></Field>
      {!isPracticeOrMeeting && <Field label="Notes (optional)"><textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>}
      {msg && <StatusMsg {...msg} />}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={disabled} style={{ padding: '0.55rem 1.25rem', background: disabled ? 'rgba(20,184,166,0.3)' : '#14B8A6', color: '#041E42', border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 700, cursor: disabled ? 'wait' : 'pointer' }}>
          {saving ? 'Saving…' : post ? 'Save changes' : 'Add to schedule'}
        </button>
        {post && (
          <button type="button" onClick={onCancel} style={{ padding: '0.55rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Status message ─────────────────────────────────────────────────────────────

function StatusMsg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ padding: '0.5rem 0.75rem', background: ok ? 'rgba(20,184,166,0.10)' : 'rgba(200,16,46,0.10)', border: `1px solid ${ok ? 'rgba(20,184,166,0.35)' : 'rgba(200,16,46,0.35)'}`, borderRadius: 6, fontSize: '0.8rem', color: ok ? '#14B8A6' : '#FF6B7A' }}>
      {ok ? '✅ ' : '❌ '}{text}
    </div>
  );
}

// ── Post list components ───────────────────────────────────────────────────────

interface DeleteOp { type: PostType; id: string; label: string; }

function NewsList({ posts, onEdit, onDelete }: { posts: NewsPost[]; onEdit: (p: NewsPost) => void; onDelete: (p: NewsPost) => void }) {
  if (!posts.length) return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: '0.5rem 0' }}>No news posts yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {posts.map(p => (
        <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)' }}>{fmtDate(p.published_at ?? p.created_at)} · {p.is_published ? 'Published' : 'Draft'}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button onClick={() => onEdit(p)} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>
              <button onClick={() => onDelete(p)} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 5, color: '#FF6B7A', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultList({ posts }: { posts: ResultPost[] }) {
  if (!posts.length) return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: '0.5rem 0' }}>No results recorded yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
      {posts.map(p => (
        <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {outcomeBadge(p.outcome)}
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{p.opponent}</span>
          <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#fff', letterSpacing: '0.05em' }}>{p.our_score}–{p.their_score}</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)' }}>{fmtDate(p.game_date)}</span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textTransform: 'capitalize' }}>{p.home_away ?? 'home'}</span>
        </div>
      ))}
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>Results are permanent — delete and re-add to correct a score.</p>
    </div>
  );
}

function ScheduleList({ posts, onEdit, onDelete }: { posts: SchedulePost[]; onEdit: (p: SchedulePost) => void; onDelete: (p: SchedulePost) => void }) {
  if (!posts.length) return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: '0.5rem 0' }}>No events scheduled yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
      {posts.map(p => (
        <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.is_cancelled ? 'rgba(200,16,46,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, padding: '0.6rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', opacity: p.is_cancelled ? 0.5 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <span style={{ fontSize: '0.875rem' }}>{kindIcon(p.kind)}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                  {kindLabel(p.kind)}{p.opponent ? ` vs ${p.opponent}` : ''}
                  {p.is_cancelled && <span style={{ color: '#FF6B7A', marginLeft: '0.4rem' }}>— Cancelled</span>}
                </p>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                  {fmtDate(p.scheduled_at, true)}{p.venue ? ` · ${p.venue}` : ''}{p.home_away && p.kind === 'game' ? ` · ${p.home_away}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button onClick={() => onEdit(p)} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>
              <button onClick={() => onDelete(p)} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 5, color: '#FF6B7A', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function AdminPostPanel({ teamSlug }: Props) {
  const [activeTab, setActiveTab] = useState<PostType>('news');

  // Post lists
  const [news, setNews] = useState<NewsPost[]>([]);
  const [results, setResults] = useState<ResultPost[]>([]);
  const [schedule, setSchedule] = useState<SchedulePost[]>([]);

  // Edit state per tab
  const [editingNews, setEditingNews] = useState<NewsPost | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<SchedulePost | null>(null);

  // Confirm-delete dialog
  const [confirmDelete, setConfirmDelete] = useState<DeleteOp | null>(null);
  const [deleting, setDeleting] = useState(false);

  const t = TABS.find(t => t.key === activeTab)!;

  const loadPosts = useCallback(async () => {
    const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts`);
    if (!r.ok) return;
    const d = await r.json();
    setNews(d.news ?? []);
    setResults(d.results ?? []);
    setSchedule(d.schedule ?? []);
  }, [teamSlug]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleDelete(op: DeleteOp) {
    setDeleting(true);
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/posts?type=${op.type}&id=${op.id}`, { method: 'DELETE' });
      if (!r.ok) { alert('Delete failed. Try again.'); return; }
      await loadPosts();
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  return (
    <section>
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete this ${confirmDelete.type}?`}
          message={`This ${confirmDelete.type} post will be permanently removed and won't appear on your public profile. This cannot be undone.`}
          confirmLabel="Delete permanently"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          danger
        />
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.2rem' }}>Public Posts</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            Updates appear on your public team profile — no login needed to view.
          </p>
        </div>
        <a href={`/directory/teams/${encodeURIComponent(teamSlug)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '0.35rem 0.75rem', background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)', borderRadius: 6, color: '#14B8A6', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          ↗ View public profile
        </a>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setEditingNews(null); setEditingSchedule(null); }} style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.key ? '#FFB81C' : 'transparent'}`, color: activeTab === tab.key ? '#FFB81C' : 'rgba(255,255,255,0.5)', borderRadius: 0, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em', transition: 'color 0.15s, border-color 0.15s', marginBottom: -1 }}>
            <span style={{ marginRight: '0.3rem' }}>{tab.icon}</span>
            {tab.label}
            {tab.key === 'news' && news.length > 0 && <span style={{ marginLeft: '0.3rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '0 0.35rem', fontSize: '0.65rem' }}>{news.length}</span>}
            {tab.key === 'result' && results.length > 0 && <span style={{ marginLeft: '0.3rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '0 0.35rem', fontSize: '0.65rem' }}>{results.length}</span>}
            {tab.key === 'schedule' && schedule.length > 0 && <span style={{ marginLeft: '0.3rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '0 0.35rem', fontSize: '0.65rem' }}>{schedule.length}</span>}
          </button>
        ))}
      </div>

      <div style={sectionBg}>
        <SectionHeader icon={t.icon} title={t.label} description={t.desc} />

        {/* News tab */}
        {activeTab === 'news' && (
          <>
            {editingNews ? (
              <>
                <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Editing an existing post.</p>
                <NewsForm teamSlug={teamSlug} post={editingNews} onSaved={() => { setEditingNews(null); loadPosts(); }} onCancel={() => setEditingNews(null)} />
              </>
            ) : (
              <>
                <NewsList posts={news} onEdit={p => setEditingNews(p)} onDelete={p => setConfirmDelete({ type: 'news', id: p.id, label: p.title })} />
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New post</p>
                  <NewsForm teamSlug={teamSlug} onSaved={loadPosts} onCancel={() => {}} />
                </div>
              </>
            )}
          </>
        )}

        {/* Results tab */}
        {activeTab === 'result' && (
          <>
            <ResultList posts={results} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.25rem' }}>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Record new result</p>
              <ResultForm teamSlug={teamSlug} onSaved={loadPosts} />
            </div>
          </>
        )}

        {/* Schedule tab */}
        {activeTab === 'schedule' && (
          <>
            {editingSchedule ? (
              <>
                <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Editing an existing event.</p>
                <ScheduleForm teamSlug={teamSlug} post={editingSchedule} onSaved={() => { setEditingSchedule(null); loadPosts(); }} onCancel={() => setEditingSchedule(null)} />
              </>
            ) : (
              <>
                <ScheduleList posts={schedule} onEdit={p => setEditingSchedule(p)} onDelete={p => setConfirmDelete({ type: 'schedule', id: p.id, label: `${kindLabel(p.kind)} — ${fmtDate(p.scheduled_at)}` })} />
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add event</p>
                  <ScheduleForm teamSlug={teamSlug} onSaved={loadPosts} onCancel={() => {}} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
