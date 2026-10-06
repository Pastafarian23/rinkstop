'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettingsAction } from '@/app/actions/games';

interface Props {
  gameId: string;
  initial: {
    period_length_seconds: number;
    periods_total: number;
    overtime_length_seconds: number;
    shootout_enabled: boolean;
  };
}

function secondsToMinutes(s: number): string {
  return (s / 60).toFixed(0);
}
function minutesToSeconds(m: string): number {
  return Math.max(0, Math.round(parseFloat(m || '0') * 60));
}

export function SettingsForm({ gameId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [periodMin, setPeriodMin] = useState(secondsToMinutes(initial.period_length_seconds));
  const [periodsTotal, setPeriodsTotal] = useState(initial.periods_total.toString());
  const [otMin, setOtMin] = useState(secondsToMinutes(initial.overtime_length_seconds));
  const [shootout, setShootout] = useState(initial.shootout_enabled);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const periodSec = minutesToSeconds(periodMin);
    const otSec = minutesToSeconds(otMin);
    const periods = parseInt(periodsTotal, 10);

    if (periodSec < 60) return setError('Period length must be at least 1 minute.');
    if (periods < 1 || periods > 5) return setError('Periods must be 1-5.');
    if (otSec < 0) return setError('Overtime length cannot be negative.');

    startTransition(async () => {
      const result = await saveSettingsAction(gameId, {
        period_length_seconds: periodSec,
        periods_total: periods,
        overtime_length_seconds: otSec,
        shootout_enabled: shootout,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/scoresheet');
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <label className="rs-label">Period length (minutes)</label>
        <input
          type="number"
          min="1"
          max="60"
          step="1"
          className="rs-input"
          value={periodMin}
          onChange={(e) => setPeriodMin(e.target.value)}
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
          NHL default: 20 minutes
        </p>
      </div>

      <div>
        <label className="rs-label">Number of regulation periods</label>
        <input
          type="number"
          min="1"
          max="5"
          step="1"
          className="rs-input"
          value={periodsTotal}
          onChange={(e) => setPeriodsTotal(e.target.value)}
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
          NHL default: 3
        </p>
      </div>

      <div>
        <label className="rs-label">Overtime length (minutes)</label>
        <input
          type="number"
          min="0"
          max="20"
          step="1"
          className="rs-input"
          value={otMin}
          onChange={(e) => setOtMin(e.target.value)}
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
          NHL default: 5 (set 0 to disable OT)
        </p>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '0.875rem 1rem',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={shootout}
          onChange={(e) => setShootout(e.target.checked)}
          style={{ width: 20, height: 20, accentColor: '#FFB81C' }}
        />
        <div>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9375rem' }}>Shootout after OT</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            If tied after OT, decide via shootout (NHL rule)
          </div>
        </div>
      </label>

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

      <button
        type="submit"
        className="rs-btn-primary"
        disabled={isPending}
        style={{ marginTop: '0.5rem' }}
      >
        {isPending ? 'Saving...' : 'Done — Back to dashboard →'}
      </button>
    </form>
  );
}
