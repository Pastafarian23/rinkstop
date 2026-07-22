'use client';

/**
 * src/app/stamp/[qrIdentifier]/stamp-confirm-form.tsx
 *
 * Client-side form for the WS3 PR2 stamp confirmation page.
 *
 * Three states:
 *   1. 'confirm' — show the question + Yes/Cancel buttons + context selector
 *      (for coach→player scans) + visibility toggle + geo opt-in.
 *   2. 'submitting' — disable buttons, show spinner.
 *   3. 'done' — show success message + "View Passport" / "Done" buttons, OR
 *      "already stamped today" message.
 *
 * Per WS3 plan: mobile-first, three taps max. Geo is opt-in (off by
 * default). Visibility defaults to private.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ResolvedStampTarget,
  StampContext,
  StampVisibility,
} from '@/lib/passport';

type State = 'confirm' | 'submitting' | 'done';

interface Props {
  qrIdentifier: string;
  target: ResolvedStampTarget;
  actorUserId: string;
  subjectUserId: string | null;
  subjectName: string | null;
}

const CONTEXT_OPTIONS: { value: StampContext; label: string }[] = [
  { value: 'practice', label: 'Practice' },
  { value: 'game', label: 'Game' },
  { value: 'check-in', label: 'Check-in' },
  { value: 'registration', label: 'Registration' },
];

export function StampConfirmForm({
  qrIdentifier,
  target,
  subjectUserId,
  subjectName,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>('confirm');
  const [context, setContext] = useState<StampContext>('practice');
  const [visibility, setVisibility] = useState<StampVisibility>('private');
  const [useGeo, setUseGeo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyStamped, setAlreadyStamped] = useState(false);

  const isCoachScan = !!subjectUserId;
  const questionText = buildQuestion(target, subjectName);
  const targetDisplayName = targetDisplay(target);

  async function handleConfirm() {
    setState('submitting');
    setError(null);

    let geoLat: number | undefined;
    let geoLng: number | undefined;

    if (useGeo && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8_000,
            maximumAge: 60_000,
          });
        });
        geoLat = pos.coords.latitude;
        geoLng = pos.coords.longitude;
      } catch {
        // Geo failure is non-blocking. Fall through; the stamp still goes
        // through, just without geo metadata.
      }
    }

    try {
      const res = await fetch('/api/passport/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrIdentifier,
          subjectUserId: subjectUserId ?? undefined,
          context: isCoachScan ? context : undefined,
          visibility,
          geoLat,
          geoLng,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? `Request failed (${res.status})`);
        setState('confirm');
        return;
      }

      const data = (await res.json()) as {
        alreadyStampedToday?: boolean;
      };
      if (data.alreadyStampedToday) {
        setAlreadyStamped(true);
      }
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setState('confirm');
    }
  }

  if (state === 'done') {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          {alreadyStamped ? (
            <>
              <h1 style={styles.title}>Already stamped today</h1>
              <p style={styles.body}>
                You've already stamped {targetDisplayName} today. One stamp
                per day per venue.
              </p>
            </>
          ) : (
            <>
              <h1 style={styles.title}>Stamped ✓</h1>
              <p style={styles.body}>
                Your Passport now records {targetDisplayName}.
                {visibility === 'public'
                  ? ' It is visible on your public Passport.'
                  : ' It is private — publish it from your dashboard to share.'}
              </p>
            </>
          )}
          <div style={styles.row}>
            <button
              type="button"
              onClick={() => router.push('/dashboard/passport')}
              style={styles.primaryButton}
            >
              View Passport
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={styles.secondaryButton}
            >
              Done
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>
          {isCoachScan ? 'Stamp a player' : 'Stamp your Passport'}
        </p>
        <h1 style={styles.title}>{questionText}</h1>

        {isCoachScan && (
          <div style={styles.section}>
            <p style={styles.label}>Context</p>
            <div style={styles.chipRow}>
              {CONTEXT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setContext(opt.value)}
                  style={{
                    ...styles.chip,
                    ...(context === opt.value ? styles.chipActive : {}),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={styles.section}>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={visibility === 'public'}
              onChange={(e) =>
                setVisibility(e.target.checked ? 'public' : 'private')
              }
            />
            <span>Publish to my public Passport</span>
          </label>
          <p style={styles.hint}>
            Off by default. You can change this later from your dashboard.
          </p>
        </div>

        <div style={styles.section}>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={useGeo}
              onChange={(e) => setUseGeo(e.target.checked)}
            />
            <span>Use my location to verify</span>
          </label>
          <p style={styles.hint}>
            Off by default. Browser will ask for permission only if you turn
            this on.
          </p>
        </div>

        {error && (
          <p style={styles.error} role="alert">
            {error}
          </p>
        )}

        <div style={styles.row}>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state === 'submitting'}
            style={{
              ...styles.primaryButton,
              ...(state === 'submitting' ? styles.disabled : {}),
            }}
          >
            {state === 'submitting' ? 'Stamping…' : 'Yes, stamp'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={state === 'submitting'}
            style={styles.secondaryButton}
          >
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}

function buildQuestion(
  target: ResolvedStampTarget,
  subjectName: string | null
): string {
  const where = targetDisplay(target);
  if (subjectName) {
    return `Stamp ${subjectName} at ${where}?`;
  }
  return `Stamp your Passport at ${where}?`;
}

function targetDisplay(t: ResolvedStampTarget): string {
  switch (t.targetType) {
    case 'rink':
      return t.rinkName;
    case 'venue':
      return t.venueName;
    case 'event':
      return `${t.eventName} (at ${t.parentName})`;
  }
}

const RINKSTOP_NAVY = '#041E42';
const SLATE_500 = '#64748b';
const SLATE_700 = '#334155';
const SLATE_900 = '#0f172a';
const PAGE_BG = '#f8fafc';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: PAGE_BG,
    padding: '24px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    fontFamily: '-apple-system, system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: SLATE_500,
    margin: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: RINKSTOP_NAVY,
    margin: '4px 0 20px',
    lineHeight: 1.25,
  },
  body: {
    fontSize: 15,
    lineHeight: 1.5,
    color: SLATE_700,
    margin: 0,
  },
  section: {
    margin: '16px 0',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: SLATE_900,
    margin: '0 0 8px',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: SLATE_700,
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 14,
    cursor: 'pointer',
  },
  chipActive: {
    borderColor: RINKSTOP_NAVY,
    background: RINKSTOP_NAVY,
    color: '#fff',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: SLATE_900,
    cursor: 'pointer',
  },
  hint: {
    fontSize: 12,
    color: SLATE_500,
    margin: '4px 0 0 24px',
  },
  row: {
    display: 'flex',
    gap: 8,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    background: RINKSTOP_NAVY,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    background: '#fff',
    color: SLATE_900,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '14px 16px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'wait',
  },
  error: {
    color: '#b91c1c',
    fontSize: 14,
    margin: '12px 0 0',
  },
};
