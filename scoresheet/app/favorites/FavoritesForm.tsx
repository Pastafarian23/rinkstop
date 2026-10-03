'use client';

import { useState, useTransition } from 'react';
import { addFavoriteAction, removeFavoriteAction } from './actions';
import type { Database } from '@/lib/database.types';

type Favorite = Database['public']['Tables']['user_favorite_teams']['Row'];

const TEAM_COLORS = [
  { label: 'Gold', value: '#FFB81C' },
  { label: 'Red', value: '#C8102E' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Orange', value: '#F97316' },
  { label: 'White', value: '#F8FAFC' },
  { label: 'Black', value: '#0F172A' },
];

export function FavoritesForm({ initial }: { userId: string; initial: Favorite[] }) {
  const [list, setList] = useState(initial);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FFB81C');
  const [error, setError] = useState<string | null>(null);
  const [isPendingAdd, startAdd] = useTransition();
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  function add() {
    setError(null);
    startAdd(async () => {
      const result = await addFavoriteAction(name, color);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setList((prev) => [
        {
          user_id: '',
          team_name: name.trim(),
          rinkstop_team_id: null,
          team_color: color,
          notes: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setName('');
    });
  }

  function remove(teamName: string) {
    setPendingRemove(teamName);
    setError(null);
    removeFavoriteAction(teamName).then((result) => {
      setPendingRemove(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setList((prev) => prev.filter((f) => f.team_name !== teamName));
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Add form */}
      <section
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <label className="rs-label">Add a favorite</label>
        <input
          type="text"
          className="rs-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          style={{ marginBottom: '0.75rem' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {TEAM_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              aria-label={c.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: c.value,
                border: color === c.value ? '2px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="rs-btn-primary"
          onClick={add}
          disabled={isPendingAdd || !name.trim()}
          style={{ width: '100%' }}
        >
          {isPendingAdd ? 'Adding...' : '+ Add to favorites'}
        </button>
      </section>

      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.45)',
            color: '#FCA5A5',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            padding: '1.5rem',
          }}
        >
          No favorites yet. Add the teams you track most.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {list.map((f) => (
            <li
              key={f.team_name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: f.team_color || '#FFB81C',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{f.team_name}</span>
              <button
                type="button"
                onClick={() => remove(f.team_name)}
                disabled={pendingRemove === f.team_name}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(200,16,46,0.4)',
                  color: '#FCA5A5',
                  padding: '0.375rem 0.75rem',
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                {pendingRemove === f.team_name ? 'Removing...' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
