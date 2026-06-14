'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ConnectionRow {
  id: string;
  user_low: string;
  user_high: string;
  initiated_by: string;
  status: 'pending' | 'accepted' | 'blocked' | 'declined';
  created_at: string;
  accepted_at: string | null;
  otherUser: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    tier: string;
  };
  isInitiator: boolean;
}

type TabKey = 'incoming' | 'outgoing' | 'accepted';

export default function ConnectionsPage() {
  const [tab, setTab] = useState<TabKey>('incoming');
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const status = tab === 'incoming' ? 'pending' : tab === 'outgoing' ? 'pending' : 'accepted';
      const res = await fetch(`/api/connections?status=${status}`);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const { connections } = await res.json();
      // For incoming/outgoing tabs, filter by initiator vs recipient.
      const filtered = (connections || []).filter((c: ConnectionRow) => {
        if (tab === 'incoming') return !c.isInitiator;
        if (tab === 'outgoing') return c.isInitiator;
        return true;
      });
      setRows(filtered);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [tab]);

  async function accept(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/connections/${id}/accept`, { method: 'POST' });
      await load();
    } finally { setBusyId(null); }
  }
  async function decline(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/connections/${id}/decline`, { method: 'POST' });
      await load();
    } finally { setBusyId(null); }
  }
  async function remove(id: string) {
    if (!confirm('Remove this connection? They will need to be re-added.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      await load();
    } finally { setBusyId(null); }
  }

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Connections</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
          Manage your mutual connections. DMs only work with people you&apos;re connected to.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e1e1e', marginBottom: '1.5rem' }}>
        {([
          ['incoming', 'Incoming Requests'],
          ['outgoing', 'Sent Requests'],
          ['accepted', 'Connected'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === key ? '2px solid #C8102E' : '2px solid transparent',
              color: tab === key ? '#fff' : 'rgba(255,255,255,0.5)',
              padding: '0.75rem 1.25rem',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>
          {tab === 'incoming' && 'No incoming requests right now.'}
          {tab === 'outgoing' && 'You haven\'t sent any connection requests.'}
          {tab === 'accepted' && 'You aren\'t connected with anyone yet. Find people on their player, team, or profile pages.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((c) => {
            const name = c.otherUser.display_name || 'RinkStop Member';
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                {c.otherUser.avatar_url ? (
                  <img src={c.otherUser.avatar_url} alt={name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#041E42', color: '#FFB81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  {c.otherUser.username ? (
                    <Link href={`/profile/${c.otherUser.username}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                      {name}
                    </Link>
                  ) : (
                    <span style={{ color: '#fff', fontWeight: 600 }}>{name}</span>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {tab === 'accepted' ? 'Connected' : c.isInitiator ? 'Request sent' : 'Wants to connect'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {tab === 'incoming' && (
                    <>
                      <button onClick={() => accept(c.id)} disabled={busyId === c.id} style={{ background: '#14B8A6', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Accept</button>
                      <button onClick={() => decline(c.id)} disabled={busyId === c.id} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Decline</button>
                    </>
                  )}
                  {tab === 'outgoing' && (
                    <button onClick={() => remove(c.id)} disabled={busyId === c.id} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  )}
                  {tab === 'accepted' && (
                    <>
                      <Link href={`/dashboard/messages?with=${c.otherUser.user_id}`} style={{ background: '#C8102E', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Message</Link>
                      <button onClick={() => remove(c.id)} disabled={busyId === c.id} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
