'use client';

/**
 * PlayerAchievementAdd — Phase 1b-2.
 * Form to add a single achievement. Inline, not a modal.
 */

import { useState } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'award', label: 'Award' },
  { value: 'team', label: 'Team' },
  { value: 'personal', label: 'Personal' },
  { value: 'stat', label: 'Stat (v2 — coming soon)' },
  { value: 'other', label: 'Other' },
];

interface PlayerAchievementAddProps {
  playerId: string;
  onAdded?: () => void;
}

export default function PlayerAchievementAdd({ playerId, onAdded }: PlayerAchievementAddProps) {
  const [stage, setStage] = useState<'idle' | 'form' | 'saving'>('idle');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('milestone');
  const [achievedAt, setAchievedAt] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setDescription('');
    setCategory('milestone');
    setAchievedAt(new Date().toISOString().slice(0, 10));
    setError(null);
    setStage('idle');
  }

  async function handleSave() {
    if (title.trim().length < 1) {
      setError('Title is required.');
      return;
    }
    if (title.length > 100) {
      setError('Title must be 100 characters or less.');
      return;
    }
    if (description.length > 500) {
      setError('Description must be 500 characters or less.');
      return;
    }
    if (category === 'stat') {
      setError('Stat-derived achievements are coming in v2. Pick another category for now.');
      return;
    }
    setStage('saving');
    setError(null);
    try {
      const res = await fetch('/api/player-achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          title: title.trim(),
          description: description.trim() || null,
          category,
          achieved_at: achievedAt,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Add failed (${res.status})`);
      }
      reset();
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('form');
    }
  }

  if (stage === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStage('form')}
        data-testid="player-achievement-add-trigger"
        style={{
          marginTop: '0.75rem',
          padding: '0.55rem 1rem',
          background: '#14B8A6',
          color: '#0a0a0a',
          border: 'none',
          borderRadius: 6,
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        + Add achievement
      </button>
    );
  }

  return (
    <div
      data-testid="player-achievement-add-form"
      style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        background: '#0a0a0a',
        border: '1px solid #1e1e1e',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.4rem 0.6rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 6,
            color: '#FF6B7A',
            fontSize: '0.8rem',
          }}
        >
          {error}
        </div>
      ) : null}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Won gold at State Championships"
        maxLength={100}
        disabled={stage === 'saving'}
        style={{
          padding: '0.5rem',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          color: '#fff',
          fontSize: '0.9rem',
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={stage === 'saving'}
          style={{
            padding: '0.4rem',
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#fff',
            fontSize: '0.85rem',
            flex: 1,
          }}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={achievedAt}
          onChange={(e) => setAchievedAt(e.target.value)}
          disabled={stage === 'saving'}
          style={{
            padding: '0.4rem',
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#fff',
            fontSize: '0.85rem',
            flex: 1,
          }}
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        disabled={stage === 'saving'}
        placeholder="Optional: what happened, who was there, why it matters"
        rows={2}
        style={{
          padding: '0.5rem',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          color: '#fff',
          fontSize: '0.85rem',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={reset}
          disabled={stage === 'saving'}
          style={{
            padding: '0.4rem 0.9rem',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            color: '#0a0a0a',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: stage === 'saving' ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={stage === 'saving'}
          style={{
            padding: '0.4rem 1.1rem',
            background: stage === 'saving' ? '#9ca3af' : '#14B8A6',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: stage === 'saving' ? 'not-allowed' : 'pointer',
          }}
        >
          {stage === 'saving' ? 'Saving…' : 'Save achievement'}
        </button>
      </div>
    </div>
  );
}
