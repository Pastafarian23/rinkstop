'use client';

// NewBookingForm — client component for /admin/bookings/new
//
// Collects buyer + rink + slot + price and POSTs to /api/admin/bookings.
// On success, shows the Stripe payment URL + bookingId so Arnel can forward
// to the buyer (or just trust them to receive the email).
//
// Defense:
//   - All numeric fields validated client-side before submit (server re-validates)
//   - Fee must be < price (enforced by both client + server CHECK constraint)
//   - End time must be > start time
//   - Currency hardcoded to USD by default; PH pilot might use PHP
//   - Buyer user_id is pulled from a Clerk look-up helper at submit time
//     (TODO Phase 1.5: replace with a Clerk user-search combobox instead of
//     free-text input — for the pilot, Arnel types the buyer email and we
//     resolve to user_id via the existing launch-signup pattern)
//
// Buyer email → user_id lookup: for the pilot, Cebu Ice Datus is Arnel's
// team and Arnel is a member. Buyer_user_id = Arnel's Clerk user_id. The
// form below accepts a buyer email and a buyer user_id separately so Arnel
// can either pick from a team dropdown (which prefills) or override.

import { useMemo, useState } from 'react';

interface RinkOption {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
}
interface TeamOption {
  id: string;
  name: string;
  slug: string;
  home_city: string | null;
  country: string | null;
}

interface Props {
  rinks: RinkOption[];
  teams: TeamOption[];
}

const FACILITATION_FEE_PERCENT = 10; // Locked in MVP plan 2026-09-10 01:41 CDT

function toDatetimeLocal(iso: string): string {
  // Convert ISO 8601 → datetime-local format (YYYY-MM-DDTHH:mm) in UTC.
  // For better UX we'd convert to rink-local TZ; for the pilot we let the
  // admin type local time and the form stores as the entered local string
  // then converts to ISO with the rink's TZ. Phase 1.5 polish.
  return iso.slice(0, 16);
}

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency.toUpperCase() === 'USD' ? '$' :
    currency.toUpperCase() === 'PHP' ? '₱' :
    currency.toUpperCase() === 'EUR' ? '€' :
    currency.toUpperCase() === 'GBP' ? '£' :
    '';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export default function NewBookingForm({ rinks, teams }: Props) {
  // Defaults: Cebu Ice Datus (Arnel's team) + SM Seaside (the pilot rink)
  const cebuDatus = teams.find((t) => t.slug === 'cebu-ice-datus-test');
  const smSeaside = rinks.find((r) => r.slug === 'sm-skating-sm-seaside-city-cebu');

  const [buyerUserId, setBuyerUserId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [teamWorkspaceId, setTeamWorkspaceId] = useState(cebuDatus?.id || '');
  const [rinkId, setRinkId] = useState(smSeaside?.id || '');
  const [title, setTitle] = useState(smSeaside ? 'Open ice practice slot' : '');
  const [startTime, setStartTime] = useState(''); // datetime-local
  const [endTime, setEndTime] = useState('');
  const [priceDollars, setPriceDollars] = useState('150');
  const [feePercent, setFeePercent] = useState(FACILITATION_FEE_PERCENT.toString());
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ bookingId: string; paymentUrl: string } | null>(null);

  // Compute fee + settlement for display
  const priceCents = useMemo(() => {
    const n = parseFloat(priceDollars);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }, [priceDollars]);
  const feeCents = useMemo(() => {
    const pct = parseFloat(feePercent);
    if (!Number.isFinite(pct) || pct < 0) return 0;
    return Math.round((priceCents * pct) / 100);
  }, [priceCents, feePercent]);
  const settlementCents = priceCents - feeCents;

  // Resolve buyer_user_id from team selection if not manually set
  // (For the pilot, Arnel is the buyer. In Phase 1.5 we'll add a Clerk user
  // search combobox so the buyer can be anyone.)
  function autofillFromTeam(teamId: string) {
    setTeamWorkspaceId(teamId);
    const team = teams.find((t) => t.id === teamId);
    if (team && !buyerName) setBuyerName(team.name + ' rep');
    if (team && !title && rinkId) {
      const rink = rinks.find((r) => r.id === rinkId);
      if (rink) setTitle(`Open ice practice at ${rink.name}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!buyerUserId) {
      setError('Buyer user_id is required. For the pilot, paste Arnel\'s Clerk user_id (user_...).');
      return;
    }
    if (!buyerEmail) { setError('Buyer email is required.'); return; }
    if (!rinkId) { setError('Rink is required.'); return; }
    if (!startTime || !endTime) { setError('Slot start + end times are required.'); return; }
    if (new Date(endTime) <= new Date(startTime)) { setError('End time must be after start time.'); return; }
    if (priceCents <= 0) { setError('Price must be > 0.'); return; }
    if (feeCents >= priceCents) { setError('Facilitation fee must be less than the total price.'); return; }

    setSubmitting(true);
    try {
      // Convert datetime-local → ISO 8601 with the rink's TZ offset.
      // For the pilot, treat the input as UTC; PH rinks can be entered
      // manually in UTC for now. Phase 1.5: convert to rink-local TZ.
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();

      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_user_id: buyerUserId,
          buyer_contact_name: buyerName,
          buyer_contact_email: buyerEmail,
          buyer_contact_phone: buyerPhone || null,
          buyer_team_workspace_id: teamWorkspaceId || null,
          rink_id: rinkId,
          start_time: startIso,
          end_time: endIso,
          title,
          notes: notes || null,
          price_cents: priceCents,
          fee_cents: feeCents,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create booking');
        setSubmitting(false);
        return;
      }

      setSuccess({ bookingId: data.bookingId, paymentUrl: data.paymentUrl });
      setSubmitting(false);
    } catch (err: any) {
      setError(err?.message || 'Network error');
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8, padding: '1.5rem', color: '#065f46' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 700 }}>Booking created</h2>
        <p style={{ margin: '0 0 1rem', lineHeight: 1.5 }}>
          Buyer has been emailed the payment link. Rink contact email went to partners@rinkstop.com — forward it manually.
        </p>
        <div style={{ background: '#fff', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Booking ID</div>
          <code style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{success.bookingId}</code>
        </div>
        <div style={{ background: '#fff', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Stripe payment URL (also emailed to buyer)</div>
          <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>{success.paymentUrl}</code>
        </div>
        <button
          type="button"
          onClick={() => { setSuccess(null); setBuyerUserId(''); setBuyerName(''); setBuyerEmail(''); setStartTime(''); setEndTime(''); setNotes(''); }}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#041E42', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
      {/* Buyer section */}
      <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
        <legend style={{ padding: '0 0.5rem', fontWeight: 700, color: '#041E42' }}>Buyer</legend>
        <Field label="Team">
          <select
            value={teamWorkspaceId}
            onChange={(e) => autofillFromTeam(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Select team (optional) —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.home_city ? ` · ${t.home_city}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Buyer name (contact)">
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Jane Doe"
            style={inputStyle}
            required
          />
        </Field>
        <Field label="Buyer email">
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="jane@example.com"
            style={inputStyle}
            required
          />
        </Field>
        <Field label="Buyer phone (optional)">
          <input
            type="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="+63 917 555 1234"
            style={inputStyle}
          />
        </Field>
        <Field label="Buyer Clerk user_id (text)">
          <input
            type="text"
            value={buyerUserId}
            onChange={(e) => setBuyerUserId(e.target.value)}
            placeholder="user_3Etd1E64kor4sHx1sbnkK3vcnpL"
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}
            required
          />
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
            For the pilot, paste Arnel's Clerk user_id. Phase 1.5 will replace this with a user-search combobox.
          </div>
        </Field>
      </fieldset>

      {/* Slot section */}
      <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
        <legend style={{ padding: '0 0.5rem', fontWeight: 700, color: '#041E42' }}>Slot</legend>
        <Field label="Rink">
          <select
            value={rinkId}
            onChange={(e) => setRinkId(e.target.value)}
            style={inputStyle}
            required
          >
            <option value="">— Select rink —</option>
            {rinks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}{r.city ? ` · ${r.city}` : ''}{r.country ? ` · ${r.country}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Open ice practice slot"
            style={inputStyle}
            required
          />
        </Field>
        <Field label="Start (local time, treated as UTC for pilot)">
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={inputStyle}
            required
          />
        </Field>
        <Field label="End">
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={inputStyle}
            required
          />
        </Field>
        <Field label="Notes for the rink (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="e.g. U12 team practice, full ice, all skill levels welcome"
          />
        </Field>
      </fieldset>

      {/* Pricing section */}
      <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
        <legend style={{ padding: '0 0.5rem', fontWeight: 700, color: '#041E42' }}>Pricing</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <Field label="Total price (buyer pays)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              style={inputStyle}
              required
            />
          </Field>
          <Field label="Facilitation fee (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
              <option value="USD">USD</option>
              <option value="PHP">PHP</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </Field>
        </div>
        <div style={{ background: '#EEF5FF', borderRadius: 6, padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.9rem' }}>
          <div><strong>Total:</strong> {formatMoney(priceCents, currency)}</div>
          <div><strong>RinkStop fee:</strong> {formatMoney(feeCents, currency)}</div>
          <div><strong>Rink receives:</strong> {formatMoney(settlementCents, currency)}</div>
        </div>
      </fieldset>

      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid #C8102E', borderRadius: 6, padding: '0.75rem 1rem', color: '#C8102E', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '0.75rem 1.25rem',
          background: submitting ? '#6b7280' : '#C8102E',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: '0.95rem',
        }}
      >
        {submitting ? 'Creating booking…' : 'Create booking + send emails'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  background: '#fff',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}