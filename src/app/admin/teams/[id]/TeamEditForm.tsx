'use client';

import { useState } from 'react';

interface Team {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  slug: string | null;
}

interface League {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  team: Team;
  leagues: League[];
  isSuperAdmin: boolean;
}

export default function TeamEditForm({ team, leagues, isSuperAdmin }: Props) {
  const [name, setName] = useState(team.name);
  const [city, setCity] = useState(team.city || '');
  const [country, setCountry] = useState(team.country || '');
  const [leagueId, setLeagueId] = useState<string>(team.league_id || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body: any = { name, city, country };
      if (isSuperAdmin) {
        body.league_id = leagueId || '';
      }
      const r = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error || j.message || 'Save failed');
      }
      setMessage({ type: 'ok', text: 'Saved.' });
      // Reload server data
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-white mb-4">Edit Team</h2>

      <div className="space-y-4">
        <Field label="Team name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-400"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </Field>
        </div>

        <Field label={`League ${!isSuperAdmin ? '(super-admin only)' : ''}`}>
          {isSuperAdmin ? (
            <select
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">— Unassigned —</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          ) : (
            <div className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-slate-500 text-sm">
              {team.league_id
                ? leagues.find((l) => l.id === team.league_id)?.name || 'Unknown'
                : 'Unassigned'}
              <span className="text-xs ml-2">(read-only)</span>
            </div>
          )}
        </Field>

        {message && (
          <div className={`px-3 py-2 rounded text-sm ${message.type === 'ok' ? 'bg-teal-400/10 text-teal-400' : 'bg-rose-400/10 text-rose-400'}`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <a
            href="/admin/teams"
            className="px-4 py-2 rounded text-slate-300 hover:text-white text-sm"
          >
            Cancel
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold rounded text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
