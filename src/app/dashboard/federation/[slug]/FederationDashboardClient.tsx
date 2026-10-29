'use client';

/**
 * Federation dashboard client.
 *
 * Everything the federation admin can do from one screen:
 *   - edit the federation profile (name goes to Arnel for approval; the rest
 *     publishes immediately)
 *   - add an existing league or club to their federation (queued for Arnel)
 *   - propose a brand-new league (queued for Arnel)
 *   - remove a member league or club (queued for Arnel)
 *   - see everything RinkStop already knows about their country
 */

import { useState } from 'react';
import Link from 'next/link';
import { countryToSlug } from '@/lib/country-page';

interface Props {
  federation: Record<string, unknown>;
  memberLeagues: Record<string, unknown>[];
  memberClubs: Record<string, unknown>[];
  pendingRequests: Record<string, unknown>[];
  availableLeagues: Record<string, unknown>[];
  availableClubs: Record<string, unknown>[];
  countryRinks: Record<string, unknown>[];
  countryName: string | null;
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #1e1e1e',
  borderRadius: 6,
  color: '#fff',
  padding: '0.5rem 0.75rem',
  fontSize: '0.9rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: '0.35rem',
};

const sectionStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '1.5rem 1.75rem',
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '1.25rem',
  letterSpacing: '0.05em',
  color: '#fff',
  margin: '0 0 0.35rem',
};

type Tab = 'profile' | 'members' | 'directory';

export default function FederationDashboardClient({
  federation,
  memberLeagues,
  memberClubs,
  pendingRequests,
  availableLeagues,
  availableClubs,
  countryRinks,
  countryName,
}: Props) {
  const [tab, setTab] = useState<Tab>('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [memberMsg, setMemberMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fedName = String(federation.name || '');
  const fedSlug = String(federation.slug || '');
  // The canonical public URL is the COUNTRY slug (e.g. /federations/india),
  // not the DB slug (e.g. /federations/in). The page accepts both, but the
  // canonical form is the one in the sitemap and the one search engines index.
  const publicHref = `/federations/${countryToSlug(countryName)}`;

  const pendingName = federation.pending_name as string | null;
  const pendingSubmittedAt = federation.pending_submitted_at as string | null;
  const pendingLogo = federation.pending_logo_url as string | null;

  const [form, setForm] = useState({
    name: fedName,
    description: (federation.description as string | null) || '',
    website_url: (federation.website_url as string | null) || '',
    contact_email: (federation.contact_email as string | null) || '',
    contact_phone: (federation.contact_phone as string | null) || '',
    logo_url: (federation.logo_url as string | null) || '',
  });

  const [leaguePick, setLeaguePick] = useState('');
  const [clubPick, setClubPick] = useState('');
  const [newLeague, setNewLeague] = useState({
    name: '',
    country: countryName || '',
    level: '',
    website_url: '',
    description: '',
  });
  const [showNewLeague, setShowNewLeague] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/manage/federation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setProfileMsg({
          ok: false,
          text: body?.message || body?.error || 'Could not save your changes.',
        });
        return;
      }
      setProfileMsg({
        ok: true,
        text: body?.pending_name
          ? 'Saved. Your new display name is with our team for approval; everything else is live now.'
          : 'Saved. Your changes are live.',
      });
    } catch {
      setProfileMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitMemberAction(body: Record<string, unknown>) {
    setBusy(true);
    setMemberMsg(null);
    try {
      const res = await fetch('/api/manage/federation/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMemberMsg({ ok: false, text: data?.error || 'Could not submit that request.' });
        return;
      }
      setMemberMsg({
        ok: true,
        text: data?.message || 'Submitted for review. We will add it shortly.',
      });
      setLeaguePick('');
      setClubPick('');
      setNewLeague({ name: '', country: countryName || '', level: '', website_url: '', description: '' });
      setShowNewLeague(false);
    } catch {
      setMemberMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Your profile' },
    { id: 'members', label: `Leagues & clubs (${memberLeagues.length + memberClubs.length})` },
    { id: 'directory', label: `What's on RinkStop${countryName ? ` (${countryName})` : ''}` },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      {/* Header */}
      <div style={{ ...sectionStyle, marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {(federation.logo_url as string | null) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(federation.logo_url)}
              alt=""
              style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8, background: '#fff' }}
            />
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.75rem',
                letterSpacing: '0.05em',
                color: '#fff',
                margin: '0 0 0.2rem',
              }}
            >
              {fedName.toUpperCase()}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
              Federation administrator dashboard
            </p>
          </div>
          <Link
            href={publicHref}
            style={{
              display: 'inline-block',
              padding: '0.55rem 1rem',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View your public page ↗
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '0.5rem 0.95rem',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: tab === t.id ? '#C8102E' : 'rgba(255,255,255,0.05)',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.7)',
              border: tab === t.id ? '1px solid #C8102E' : '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- PROFILE TAB ---------------- */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pendingName && (
            <div
              style={{
                background: 'rgba(255,184,28,0.08)',
                border: '1px solid rgba(255,184,28,0.3)',
                color: '#FFB81C',
                padding: '0.9rem 1.1rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                lineHeight: 1.55,
              }}
            >
              <strong>Name change awaiting approval.</strong> Your display name is currently
              &ldquo;{fedName}&rdquo;. We asked for &ldquo;{pendingName}&rdquo;
              {pendingSubmittedAt
                ? ` (submitted ${new Date(pendingSubmittedAt).toLocaleDateString()})`
                : ''}
              . We review name changes by hand so a typo cannot reach the public site.
            </div>
          )}
          {pendingLogo && (
            <div
              style={{
                background: 'rgba(255,184,28,0.08)',
                border: '1px solid rgba(255,184,28,0.3)',
                color: '#FFB81C',
                padding: '0.9rem 1.1rem',
                borderRadius: 8,
                fontSize: '0.875rem',
              }}
            >
              <strong>Logo change awaiting approval.</strong>
            </div>
          )}

          <div style={sectionStyle}>
            <h2 style={h2Style}>YOUR PROFILE</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              This is what people see on your RinkStop federation page.
            </p>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Federation name</label>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.78rem', margin: '0.35rem 0 0' }}>
                  A new name is checked by our team before it goes live.
                </p>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell people about your federation — what you run, who your members are, what season your calendar follows."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Official website</label>
                  <input
                    style={inputStyle}
                    value={form.website_url}
                    onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contact email</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contact phone</label>
                  <input
                    style={inputStyle}
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Logo URL</label>
                  <input
                    style={inputStyle}
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://.../logo.png"
                  />
                </div>
              </div>
            </div>

            {profileMsg && (
              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '0.875rem',
                  color: profileMsg.ok ? '#4ADE80' : '#FF6B7A',
                }}
              >
                {profileMsg.text}
              </p>
            )}

            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile}
                style={{
                  padding: '0.65rem 1.35rem',
                  background: '#C8102E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  cursor: savingProfile ? 'wait' : 'pointer',
                  opacity: savingProfile ? 0.6 : 1,
                }}
              >
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MEMBERS TAB ---------------- */}
      {tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {memberMsg && (
            <div
              style={{
                background: memberMsg.ok ? 'rgba(34,197,94,0.08)' : 'rgba(200,16,46,0.1)',
                border: `1px solid ${memberMsg.ok ? 'rgba(34,197,94,0.3)' : 'rgba(200,16,46,0.4)'}`,
                color: memberMsg.ok ? '#4ADE80' : '#FF6B7A',
                padding: '0.9rem 1.1rem',
                borderRadius: 8,
                fontSize: '0.875rem',
              }}
            >
              {memberMsg.text}
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div style={sectionStyle}>
              <h2 style={h2Style}>AWAITING REVIEW</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                These have been sent to the RinkStop team. They go live once we approve them.
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.6rem' }}>
                {pendingRequests.map((r) => {
                  const label =
                    (r.proposed_name as string | null) ||
                    (r.member_type === 'league' ? 'League' : 'Club');
                  return (
                    <li
                      key={String(r.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.6rem 0.85rem',
                        background: 'rgba(255,184,28,0.06)',
                        border: '1px solid rgba(255,184,28,0.22)',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                      }}
                    >
                      <span style={{ color: '#fff' }}>
                        <span style={{ color: '#FFB81C', fontWeight: 700, marginRight: '0.5rem' }}>
                          {r.member_type === 'league' ? 'LEAGUE' : 'CLUB'}
                        </span>
                        {label}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(String(r.created_at)).toLocaleDateString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Member leagues */}
          <div style={sectionStyle}>
            <h2 style={h2Style}>MEMBER LEAGUES</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Leagues we already list that belong to your federation. Adding one links it to your
              federation page.
            </p>

            {memberLeagues.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: '0 0 1.25rem', padding: 0, display: 'grid', gap: '0.5rem' }}>
                {memberLeagues.map((l) => (
                  <li
                    key={String(l.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: '#fff' }}>{String(l.name)}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        submitMemberAction({
                          action: 'remove',
                          member_type: 'league',
                          league_id: l.id,
                        })
                      }
                      style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.6)',
                        borderRadius: 6,
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
                No leagues linked yet.
              </p>
            )}

            {availableLeagues.length > 0 && (
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={labelStyle}>Add an existing league</label>
                  <select
                    style={inputStyle}
                    value={leaguePick}
                    onChange={(e) => setLeaguePick(e.target.value)}
                  >
                    <option value="">Choose a league…</option>
                    {availableLeagues.map((l) => (
                      <option key={String(l.id)} value={String(l.id)}>
                        {String(l.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={busy || !leaguePick}
                  onClick={() =>
                    submitMemberAction({
                      action: 'add',
                      member_type: 'league',
                      league_id: leaguePick,
                    })
                  }
                  style={{
                    padding: '0.6rem 1.1rem',
                    background: leaguePick ? '#C8102E' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: leaguePick ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add league
                </button>
              </div>
            )}

            <div style={{ marginTop: '1rem' }}>
              {!showNewLeague ? (
                <button
                  type="button"
                  onClick={() => setShowNewLeague(true)}
                  style={{
                    background: 'none',
                    border: '1px dashed rgba(255,255,255,0.25)',
                    color: 'rgba(255,255,255,0.65)',
                    borderRadius: 8,
                    padding: '0.55rem 1rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  + We run a league you are not listed for
                </button>
              ) : (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    display: 'grid',
                    gap: '0.85rem',
                  }}
                >
                  <div>
                    <label style={labelStyle}>League name</label>
                    <input
                      style={inputStyle}
                      value={newLeague.name}
                      onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                    <div>
                      <label style={labelStyle}>Country</label>
                      <input
                        style={inputStyle}
                        value={newLeague.country}
                        onChange={(e) => setNewLeague({ ...newLeague, country: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Level / division</label>
                      <input
                        style={inputStyle}
                        value={newLeague.level}
                        onChange={(e) => setNewLeague({ ...newLeague, level: e.target.value })}
                        placeholder="e.g. National, U18, State"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Website</label>
                      <input
                        style={inputStyle}
                        value={newLeague.website_url}
                        onChange={(e) => setNewLeague({ ...newLeague, website_url: e.target.value })}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                      value={newLeague.description}
                      onChange={(e) => setNewLeague({ ...newLeague, description: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      disabled={busy || !newLeague.name.trim()}
                      onClick={() =>
                        submitMemberAction({
                          action: 'propose_league',
                          ...newLeague,
                        })
                      }
                      style={{
                        padding: '0.6rem 1.1rem',
                        background: newLeague.name.trim() ? '#C8102E' : 'rgba(255,255,255,0.06)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: newLeague.name.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Submit league
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewLeague(false)}
                      style={{
                        padding: '0.6rem 1rem',
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.7)',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Member clubs */}
          <div style={sectionStyle}>
            <h2 style={h2Style}>MEMBER CLUBS</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Clubs and teams we already list that belong to your federation.
            </p>

            {memberClubs.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: '0 0 1.25rem', padding: 0, display: 'grid', gap: '0.5rem' }}>
                {memberClubs.map((c) => (
                  <li
                    key={String(c.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ color: '#fff' }}>
                      {String(c.name)}
                      {c.home_city ? (
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {String(c.home_city)}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        submitMemberAction({
                          action: 'remove',
                          member_type: 'club',
                          team_id: c.id,
                        })
                      }
                      style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.6)',
                        borderRadius: 6,
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
                No clubs linked yet.
              </p>
            )}

            {availableClubs.length > 0 && (
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={labelStyle}>Add an existing club</label>
                  <select style={inputStyle} value={clubPick} onChange={(e) => setClubPick(e.target.value)}>
                    <option value="">Choose a club…</option>
                    {availableClubs.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {String(c.name)}
                        {c.home_city ? ` — ${String(c.home_city)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={busy || !clubPick}
                  onClick={() =>
                    submitMemberAction({
                      action: 'add',
                      member_type: 'club',
                      team_id: clubPick,
                    })
                  }
                  style={{
                    padding: '0.6rem 1.1rem',
                    background: clubPick ? '#C8102E' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: clubPick ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add club
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- DIRECTORY TAB ---------------- */}
      {tab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={sectionStyle}>
            <h2 style={h2Style}>WHAT RINKSTOP ALREADY KNOWS</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              {countryName
                ? `Everything currently listed for ${countryName}. If something is wrong, tell us — we fix the data, not the argument.`
                : 'Everything currently listed for your country.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Rinks', value: countryRinks.length },
                { label: 'Leagues linked', value: memberLeagues.length },
                { label: 'Clubs linked', value: memberClubs.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: '0.9rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.2rem' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {countryRinks.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 0.6rem' }}>
                  Rinks
                </h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}>
                  {countryRinks.map((r) => (
                    <li
                      key={String(r.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ color: '#fff' }}>
                        {String(r.name)}
                        {r.city ? (
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {String(r.city)}</span>
                        ) : null}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
                        {String(r.status || '')}
                        {r.capacity ? ` · ${r.capacity}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
