'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { suggestSlug } from '@/lib/team';

interface RinkOption {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  province_state: string | null;
}

// Mapping from country full name to ISO 3166-1 alpha-2 code
// (rinks.country is full name; we need ISO for the team record)
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'Philippines': 'PH',
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'Canada': 'CA',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Great Britain': 'GB',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Sweden': 'SE',
  'Finland': 'FI',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Belgium': 'BE',
  'Ireland': 'IE',
  'Portugal': 'PT',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Slovakia': 'SK',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Greece': 'GR',
  'Turkey': 'TR',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Korea': 'KR',
  'China': 'CN',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Indonesia': 'ID',
  'India': 'IN',
  'Pakistan': 'PK',
  'Bangladesh': 'BD',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Morocco': 'MA',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  'Israel': 'IL',
  'Qatar': 'QA',
  'Kuwait': 'KW',
};

function countryNameToCode(name: string | null | undefined): string | null {
  if (!name) return null;
  return COUNTRY_NAME_TO_CODE[name] ?? null;
}

export default function NewTeamForm({ rinks }: { rinks: RinkOption[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortName, setShortName] = useState('');
  const [rinkId, setRinkId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryTouched, setCountryTouched] = useState(false);
  const [ageCat, setAgeCat] = useState('youth');
  const [ageLabel, setAgeLabel] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [parentOrg, setParentOrg] = useState('');
  const [season, setSeason] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest slug from name (until user edits it)
  const suggestedSlug = useMemo(() => suggestSlug(name), [name]);
  const effectiveSlug = slugTouched ? slug : suggestedSlug;

  // Auto-fill country from selected rink (until user overrides it)
  const selectedRink = useMemo(() => rinks.find((r) => r.id === rinkId) || null, [rinks, rinkId]);
  const rinkCountryCode = useMemo(() => countryNameToCode(selectedRink?.country), [selectedRink]);
  const effectiveCountry = countryTouched ? countryCode : (rinkCountryCode || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !effectiveSlug || !ageCat) {
      setError('Please fill in team name, slug, and age category.');
      return;
    }
    // BUG #6 FIX: catch invalid numeric input before submitting.
    // "abc" or other non-numeric strings used to silently become NULL because
    // !isNaN(Number("abc")) is false — the user got no feedback that their
    // input was lost. Now we surface a friendly error.
    if (ageMin.trim() !== '' && !/^\d+$/.test(ageMin.trim())) {
      setError('Min age must be a whole number 0-99.');
      return;
    }
    if (ageMax.trim() !== '' && !/^\d+$/.test(ageMax.trim())) {
      setError('Max age must be a whole number 0-99.');
      return;
    }
    // BUG (age range sanity): catch min > max client-side for a clearer message.
    const minN = ageMin.trim() !== '' ? parseInt(ageMin, 10) : null;
    const maxN = ageMax.trim() !== '' ? parseInt(ageMax, 10) : null;
    if (minN != null && maxN != null && minN > maxN) {
      setError(`Min age (${minN}) can't be greater than Max age (${maxN}).`);
      return;
    }
    setBusy(true);
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await sb.rpc('create_team_workspace', {
        p_name: name.trim(),
        p_slug: effectiveSlug,
        p_country: effectiveCountry || null,
        p_age_cat: ageCat,
        p_rink_id: rinkId || null,
        p_short_name: shortName.trim() || null,
        p_season: season.trim() || null,
        p_level: level.trim() || null,
        p_age_label: ageLabel.trim() || null,
        // IMPORTANT: use regex check, not isNaN — "0" is valid but "abc" must error.
        // Regex /^\d+$/ requires the string to be entirely digits.
        p_age_min: ageMin.trim() !== '' ? parseInt(ageMin, 10) : null,
        p_age_max: ageMax.trim() !== '' ? parseInt(ageMax, 10) : null,
        p_parent_org: parentOrg.trim() || null,
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data?.ok) {
        setError(data?.message || data?.error || 'Could not create team');
        return;
      }
      router.push(`/dashboard/team/${data.team_slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
      }}
    >
      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      <Field label="Team name" hint="The full name, e.g. 'Cebu Ice Datus'">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="Cebu Ice Datus"
          style={inputStyle}
        />
      </Field>

      <Field
        label="URL slug"
        hint={`Your team hub will live at /dashboard/team/${effectiveSlug || 'your-slug'}`}
      >
        <input
          type="text"
          value={effectiveSlug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          required
          maxLength={50}
          placeholder="cebu-ice-datus"
          style={{ ...inputStyle, fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
        />
      </Field>

      <Field label="Short name" hint="Optional. Used in headers, e.g. 'Datus'">
        <input
          type="text"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          maxLength={20}
          placeholder="Datus"
          style={inputStyle}
        />
      </Field>

      <Field label="Home rink" hint="Where you play or practice. Sets the team's location.">
        <select
          value={rinkId}
          onChange={(e) => setRinkId(e.target.value)}
          style={inputStyle}
        >
          <option value="">— No home rink (select later) —</option>
          {rinks.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.city ? ` — ${r.city}` : ''}
              {r.country ? `, ${r.country}` : ''}
            </option>
          ))}
        </select>
        {selectedRink && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            {selectedRink.province_state ? `${selectedRink.province_state}, ` : ''}
            {selectedRink.country}
          </div>
        )}
      </Field>

      <Field
        label="Country"
        hint={rinkCountryCode ? 'Auto-filled from your home rink. Change if needed.' : 'Defaults to United States if unset.'}
      >
        <select
          value={effectiveCountry}
          onChange={(e) => {
            setCountryCode(e.target.value);
            setCountryTouched(true);
          }}
          style={inputStyle}
        >
          <option value="">— Use United States —</option>
          <option value="PH">🇵🇭 Philippines</option>
          <option value="US">🇺🇸 United States</option>
          <option value="CA">🇨🇦 Canada</option>
          <option value="GB">🇬🇧 United Kingdom</option>
          <option value="AU">🇦🇺 Australia</option>
          <option value="NZ">🇳🇿 New Zealand</option>
          <option value="DE">🇩🇪 Germany</option>
          <option value="FR">🇫🇷 France</option>
          <option value="IT">🇮🇹 Italy</option>
          <option value="ES">🇪🇸 Spain</option>
          <option value="SE">🇸🇪 Sweden</option>
          <option value="FI">🇫🇮 Finland</option>
          <option value="NO">🇳🇴 Norway</option>
          <option value="DK">🇩🇰 Denmark</option>
          <option value="CH">🇨🇭 Switzerland</option>
          <option value="JP">🇯🇵 Japan</option>
          <option value="KR">🇰🇷 South Korea</option>
          <option value="CN">🇨🇳 China</option>
          <option value="IN">🇮🇳 India</option>
          <option value="MX">🇲🇽 Mexico</option>
          <option value="BR">🇧🇷 Brazil</option>
        </select>
      </Field>

      <Field label="Age category" hint="What age range plays on this team?">
        <select value={ageCat} onChange={(e) => setAgeCat(e.target.value)} style={inputStyle}>
          <option value="youth">Youth (under 18)</option>
          <option value="adult">Adult (18+)</option>
          <option value="mixed">Mixed (youth + adult)</option>
        </select>
      </Field>

      <Field label="Age label" hint="Custom name for the age group, e.g. 'U12', 'Bantam AAA', 'Overage'. Shown on the team hub.">
        <input
          type="text"
          value={ageLabel}
          onChange={(e) => setAgeLabel(e.target.value)}
          maxLength={30}
          placeholder="U12"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Field label="Min age" hint="Optional. Lower bound for filtering.">
          <input
            type="number"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            min={0}
            max={99}
            placeholder="8"
            style={inputStyle}
          />
        </Field>
        <Field label="Max age" hint="Optional. Upper bound. Use 99 for open-ended.">
          <input
            type="number"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            min={0}
            max={99}
            placeholder="12"
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Parent org / Club" hint="Optional. If this is one of several teams in the same club, name the club here. Dashboard groups by club.">
        <input
          type="text"
          value={parentOrg}
          onChange={(e) => setParentOrg(e.target.value)}
          maxLength={100}
          placeholder="Cebu Ice Datus"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Field label="Season" hint="e.g. '2026-2027'">
          <input
            type="text"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            maxLength={20}
            placeholder="2026-2027"
            style={inputStyle}
          />
        </Field>
        <Field label="Level" hint="e.g. 'Beginner', 'House', 'Travel', 'AAA'">
          <input
            type="text"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            maxLength={30}
            placeholder="Beginner"
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Description" hint="Optional. Visible on the team hub.">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="A youth hockey team in Cebu..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button
          type="submit"
          disabled={busy || !name || !effectiveSlug}
          style={{
            padding: '0.7rem 1.5rem',
            background: '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: busy || !name || !effectiveSlug ? 'not-allowed' : 'pointer',
            opacity: busy || !name || !effectiveSlug ? 0.6 : 1,
          }}
        >
          {busy ? 'Creating…' : 'Create team'}
        </button>
        <a
          href="/dashboard"
          style={{
            padding: '0.7rem 1.5rem',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{hint}</span>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.875rem',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  fontWeight: 500,
};
