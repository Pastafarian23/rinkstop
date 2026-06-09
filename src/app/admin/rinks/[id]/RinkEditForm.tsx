'use client';

import { useState } from 'react';

interface Rink {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  slug: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  rink: Rink;
}

export default function RinkEditForm({ rink }: Props) {
  const [name, setName] = useState(rink.name);
  const [city, setCity] = useState(rink.city || '');
  const [state, setState] = useState(rink.state || '');
  const [country, setCountry] = useState(rink.country || '');
  const [lat, setLat] = useState(rink.latitude !== null ? String(rink.latitude) : '');
  const [lng, setLng] = useState(rink.longitude !== null ? String(rink.longitude) : '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body: any = { name, city, state, country };
      if (lat && lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
          body.latitude = latNum;
          body.longitude = lngNum;
        }
      }
      const r = await fetch(`/api/admin/rinks/${rink.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error || j.message || 'Save failed');
      }
      setMessage({ type: 'ok', text: 'Saved.' });
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-white mb-4">Edit Rink</h2>

      <div className="space-y-4">
        <Field label="Rink name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-400"
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-400"
            />
          </Field>
          <Field label="State">
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input
              type="text"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 41.8781"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
            />
          </Field>
          <Field label="Longitude">
            <input
              type="text"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. -87.6298"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
            />
          </Field>
        </div>

        {message && (
          <div className={`px-3 py-2 rounded text-sm ${message.type === 'ok' ? 'bg-teal-400/10 text-teal-400' : 'bg-rose-400/10 text-rose-400'}`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <a
            href="/admin/rinks"
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
