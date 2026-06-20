'use client';

import { useState } from 'react';

interface Settings {
  email: string | null;
  displayName: string | null;
  email_team_news: boolean;
  email_team_results: boolean;
  email_team_schedule: boolean;
  email_connection_requests: boolean;
  email_dm_notifications: boolean;
  email_payment_notifications: boolean;
  email_marketing: boolean;
}

interface Row {
  key: keyof Settings;
  label: string;
  description: string;
}

const ROWS: Row[] = [
  {
    key: 'email_team_news',
    label: 'Team news',
    description: 'When a team you\'re a member of posts news.',
  },
  {
    key: 'email_team_results',
    label: 'Game results',
    description: 'When a team you\'re a member of posts a final score.',
  },
  {
    key: 'email_team_schedule',
    label: 'Schedule updates',
    description: 'When a team you\'re a member of posts a new event.',
  },
  {
    key: 'email_connection_requests',
    label: 'Connection requests',
    description: 'When another user sends you a connection request. (Pro+ feature.)',
  },
  {
    key: 'email_dm_notifications',
    label: 'DM notifications',
    description: 'When someone you\'re connected with sends a DM while you\'re offline. (Pro+ feature.)',
  },
  {
    key: 'email_payment_notifications',
    label: 'Payment notifications (coaches)',
    description: 'When a player on one of your teams marks a payment as pending verification. Coaches only.',
  },
  {
    key: 'email_marketing',
    label: 'Marketing &amp; newsletter',
    description: 'Product updates, hockey-news roundups, and the RinkStop monthly digest. Off by default.',
  },
];

export default function NotificationSettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState<null | 'idle' | 'saving' | 'saved' | 'error'>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave() {
    setSaving('saving');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/profile/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_team_news: settings.email_team_news,
          email_team_results: settings.email_team_results,
          email_team_schedule: settings.email_team_schedule,
          email_connection_requests: settings.email_connection_requests,
          email_dm_notifications: settings.email_dm_notifications,
          email_payment_notifications: settings.email_payment_notifications,
          email_marketing: settings.email_marketing,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Save failed');
      }
      setSaving('saved');
      setTimeout(() => setSaving(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setErrorMsg(msg);
      setSaving('error');
    }
  }

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
        Sending to: <strong style={{ color: '#fff' }}>{settings.email || '(no email on file)'}</strong>
        {!settings.email && (
          <div style={{ marginTop: '0.5rem', color: '#FFB81C', fontSize: '0.75rem' }}>
            Update your Clerk account to add an email, then refresh this page.
          </div>
        )}
      </div>

      {ROWS.map((row) => (
        <label
          key={row.key}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.75rem 0',
            borderTop: '1px solid #1e1e1e',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(settings[row.key])}
            onChange={(e) => setSettings({ ...settings, [row.key]: e.target.checked })}
            style={{ marginTop: '0.25rem', accentColor: '#C8102E' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: row.label }} />
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
              {row.description}
            </div>
          </div>
        </label>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={handleSave}
          disabled={saving === 'saving'}
          style={{
            background: '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: saving === 'saving' ? 'wait' : 'pointer',
            opacity: saving === 'saving' ? 0.6 : 1,
          }}
        >
          {saving === 'saving' ? 'Saving…' : 'Save preferences'}
        </button>
        {saving === 'saved' && <span style={{ color: '#4ade80', fontSize: '0.8125rem' }}>Saved.</span>}
        {saving === 'error' && <span style={{ color: '#ff5555', fontSize: '0.8125rem' }}>{errorMsg}</span>}
      </div>
    </div>
  );
}
