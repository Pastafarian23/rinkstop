'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  initialEntityType: string;
  initialEntityId: string;
  initialFieldName: string;
  initialCurrentValue: string;
}

const ENTITY_TYPES = [
  { value: 'player', label: 'Player' },
  { value: 'team', label: 'Team' },
  { value: 'rink', label: 'Rink' },
  { value: 'league', label: 'League' },
];

const FIELDS_BY_TYPE: Record<string, Array<{ value: string; label: string }>> = {
  player: [
    { value: 'first_name', label: 'First name' },
    { value: 'last_name', label: 'Last name' },
    { value: 'position', label: 'Position' },
    { value: 'jersey_number', label: 'Jersey number' },
    { value: 'shoots', label: 'Shoots (L/R)' },
    { value: 'catches', label: 'Catches (L/R)' },
    { value: 'height_cm', label: 'Height (cm)' },
    { value: 'weight_kg', label: 'Weight (kg)' },
    { value: 'birth_date', label: 'Birth date (YYYY-MM-DD)' },
    { value: 'nationality', label: 'Nationality' },
    { value: 'bio', label: 'Bio' },
  ],
  team: [{ value: 'name', label: 'Team name' }],
  rink: [{ value: 'name', label: 'Rink name' }],
  league: [{ value: 'name', label: 'League name' }],
};

export default function CorrectionForm({
  initialEntityType,
  initialEntityId,
  initialFieldName,
  initialCurrentValue,
}: Props) {
  const router = useRouter();
  const [entityType, setEntityType] = useState(initialEntityType);
  const [entityId, setEntityId] = useState(initialEntityId);
  const [fieldName, setFieldName] = useState(initialFieldName);
  const [currentValue, setCurrentValue] = useState(initialCurrentValue);
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fields = FIELDS_BY_TYPE[entityType] || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          field_name: fieldName,
          current_value: currentValue || null,
          proposed_value: proposedValue,
          reason,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Submission failed.');
        setSubmitting(false);
        return;
      }
      setSuccess('Submitted! Your correction is in the admin queue.');
      setProposedValue('');
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="correction-form"
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Entity type
          </label>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setFieldName('');
            }}
            style={selectStyle}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Entity ID (uuid for player/team/rink; league code for league)
          </label>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="e.g. 6a41db2e-..."
            required
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Field
        </label>
        <select
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          required
          style={selectStyle}
        >
          <option value="">Select a field</option>
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current value (optional)
          </label>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="What's there now"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Proposed value *
          </label>
          <input
            type="text"
            value={proposedValue}
            onChange={(e) => setProposedValue(e.target.value)}
            placeholder="What it should be"
            required
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Reason (10-1000 characters) *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is the current value wrong? Where did you get the new value from?"
          minLength={10}
          maxLength={1000}
          required
          rows={4}
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
        />
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginTop: 4 }}>
          {reason.length}/1000
        </div>
      </div>

      {error ? (
        <div role="alert" style={{ padding: '0.6rem 0.85rem', background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 8, color: '#FF6B7A', fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : null}

      {success ? (
        <div role="status" style={{ padding: '0.6rem 0.85rem', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.4)', borderRadius: 8, color: '#14B8A6', fontSize: '0.85rem' }}>
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        style={{
          alignSelf: 'flex-start',
          padding: '0.55rem 1.25rem',
          background: submitting ? 'rgba(20,184,166,0.3)' : '#14B8A6',
          color: '#0a0a0a',
          border: 'none',
          borderRadius: 6,
          fontSize: '0.875rem',
          fontWeight: 700,
          cursor: submitting ? 'wait' : 'pointer',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit correction'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  background: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.875rem',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
};