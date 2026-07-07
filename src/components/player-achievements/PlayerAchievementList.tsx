'use client';

/**
 * PlayerAchievementList — Phase 1b-2.
 * Read-only display of a player's achievements. Edit-in-place via inline
 * form on each row. No delete in v1 (destructive action protocol).
 */

import { useState } from 'react';

export interface PlayerAchievement {
  id: string;
  player_id: string;
  title: string;
  description: string | null;
  category: 'milestone' | 'tournament' | 'award' | 'team' | 'personal' | 'stat' | 'other';
  achieved_at: string;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  milestone: 'Milestone',
  tournament: 'Tournament',
  award: 'Award',
  team: 'Team',
  personal: 'Personal',
  stat: 'Stat',
  other: 'Other',
};

const CATEGORY_ICON: Record<string, string> = {
  milestone: '⭐',
  tournament: '🏆',
  award: '🥇',
  team: '🏒',
  personal: '✨',
  stat: '📊',
  other: '📌',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isFuture(iso: string): boolean {
  return iso > new Date().toISOString().slice(0, 10);
}

interface PlayerAchievementListProps {
  playerId: string;
  achievements: PlayerAchievement[];
  onChange?: () => void;
}

export default function PlayerAchievementList({
  playerId: _playerId,
  achievements,
  onChange,
}: PlayerAchievementListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (achievements.length === 0) {
    return (
      <div
        data-testid="player-achievement-empty"
        style={{
          padding: '1rem',
          background: '#0a0a0a',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 10,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.85rem',
        }}
      >
        No achievements yet. Add a tournament win, a personal best, or a team milestone to get started.
      </div>
    );
  }

  return (
    <div data-testid="player-achievement-list">
      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 8,
            color: '#FF6B7A',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          {error}
        </div>
      ) : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {achievements.map((a) => (
          <li
            key={a.id}
            data-testid="player-achievement-row"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '0.65rem 0.75rem',
              background: '#0a0a0a',
              border: '1px solid #141414',
              borderRadius: 8,
            }}
          >
            <span aria-hidden style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>
              {CATEGORY_ICON[a.category] || '📌'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingId === a.id ? (
                <EditRow
                  achievement={a}
                  busy={busy === a.id}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    onChange?.();
                  }}
                  onError={(msg) => setError(msg)}
                  setBusy={setBusy}
                />
              ) : (
                <>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={a.title}
                  >
                    {a.title}
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '0.72rem',
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginTop: 2,
                    }}
                  >
                    <span>{CATEGORY_LABEL[a.category] || a.category}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {isFuture(a.achieved_at) ? 'scheduled for ' : ''}
                      {formatDate(a.achieved_at)}
                    </span>
                  </div>
                  {a.description ? (
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.78rem',
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {a.description}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            {editingId !== a.id ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditingId(a.id);
                }}
                disabled={busy === a.id}
                style={{
                  padding: '0.3rem 0.55rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: busy === a.id ? 'not-allowed' : 'pointer',
                  opacity: busy === a.id ? 0.5 : 1,
                  flexShrink: 0,
                }}
                title="Edit this achievement"
              >
                Edit
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditRow({
  achievement,
  busy,
  onCancel,
  onSaved,
  onError,
  setBusy,
}: {
  achievement: PlayerAchievement;
  busy: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  setBusy: (b: string | null) => void;
}) {
  const [title, setTitle] = useState(achievement.title);
  const [description, setDescription] = useState(achievement.description ?? '');
  const [category, setCategory] = useState(achievement.category);
  const [achievedAt, setAchievedAt] = useState(achievement.achieved_at);

  async function handleSave() {
    if (title.trim().length < 1 || title.length > 100) {
      onError('Title must be 1-100 characters.');
      return;
    }
    if (description.length > 500) {
      onError('Description must be 500 characters or less.');
      return;
    }
    setBusy(achievement.id);
    try {
      const res = await fetch(`/api/player-achievements/${achievement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          achieved_at: achievedAt,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Edit failed (${res.status})`);
      }
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-testid="player-achievement-edit" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        disabled={busy}
        style={{
          padding: '0.4rem 0.5rem',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          color: '#fff',
          fontSize: '0.85rem',
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          disabled={busy}
          style={{
            padding: '0.35rem 0.4rem',
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#fff',
            fontSize: '0.8rem',
            flex: 1,
          }}
        >
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          type="date"
          value={achievedAt}
          onChange={(e) => setAchievedAt(e.target.value)}
          disabled={busy}
          style={{
            padding: '0.35rem 0.4rem',
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#fff',
            fontSize: '0.8rem',
            flex: 1,
          }}
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        disabled={busy}
        placeholder="Optional description"
        rows={2}
        style={{
          padding: '0.4rem 0.5rem',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          color: '#fff',
          fontSize: '0.8rem',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: '0.35rem 0.75rem',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            color: '#0a0a0a',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          style={{
            padding: '0.35rem 0.75rem',
            background: busy ? '#9ca3af' : '#14B8A6',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
