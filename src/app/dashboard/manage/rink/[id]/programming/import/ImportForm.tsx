// src/app/dashboard/manage/rink/[id]/programming/import/ImportForm.tsx
//
// WS32 - Client CSV import form.
//
// Flow:
//   1. Operator picks a CSV file. We parse client-side so the operator sees the
//   preview + per-row errors before any data is sent.
//   2. CSV is parsed with a small RFC-4180-ish parser (handles quoted fields
//   with embedded commas / newlines; doesn't try to be a full Excel reader).
//   3. Each row is validated against the same column constraints the API
//   enforces. Bad rows are flagged; valid rows go into the preview table.
//   4. "Import N rows" sends ONLY the validated ones to the server. Server
//   re-validates and bulk-inserts.
//
// We deliberately do not auto-fix rows (e.g. mapping "Monday" → 1). The
// reason: silent data massaging has burned us before (CSVs confirmed by
// Arnel running the SQL). Operators must read errors and fix the file, not
// have bad data land in production under a "looks fine" UI.

'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const ACTIVITY_TYPES = [
  'public_skate','stick_and_puck','learn_to_skate','open_hockey','pickup','drop_in',
  'youth_league','adult_league','shinny','rat_hockey','broomball','figure_skating','tournament','camp','tryout','showcase','other',
] as const;
const SKILL_LEVELS = ['all','beginner','intermediate','advanced','elite'] as const;
const GENDERS = ['all','boys','girls','men','women','coed'] as const;

// Minimal CSV → string[][] record keeping per RFC 4180 quotes/escapes. Not built
// for general use; just enough to handle the export from Excel / Numbers / Google
// Sheets that an operator would actually produce.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        // Skip blank trailing rows (just an empty line at EOF).
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

const EXPECTED_COLUMNS = [
  'day_of_week','start_time','end_time','activity_type','skill_level','gender',
  'age_min','age_max','price_cents','currency','capacity','description','gear_rules',
];

// Header column name aliases — operators write the CSV by hand and "day_of_week"
// gets renamed to "Day" or "day" pretty often. Match case-insensitively and on
// a few friendly names. booking_url is intentionally excluded from the bulk
// importer per WS32 brief (it's rarely populated in batch uploads).
const HEADER_ALIASES: Record<string, string> = {
  day: 'day_of_week',
  dayofweek: 'day_of_week',
  day_of_week: 'day_of_week',
  start: 'start_time',
  start_time: 'start_time',
  end: 'end_time',
  end_time: 'end_time',
  activity: 'activity_type',
  activity_type: 'activity_type',
  skill: 'skill_level',
  skill_level: 'skill_level',
  ages: 'age_min', // ambiguous; we don't try to map ages → age_max
  age_min: 'age_min',
  age_max: 'age_max',
  min_age: 'age_min',
  max_age: 'age_max',
  price: 'price_cents',
  price_cents: 'price_cents',
  currency: 'currency',
  capacity: 'capacity',
  description: 'description',
  notes: 'description',
  gear: 'gear_rules',
  gear_rules: 'gear_rules',
};

function normalizeHeader(h: string): string {
  const trimmed = h.trim().toLowerCase().replace(/\s+/g, '_');
  return HEADER_ALIASES[trimmed] ?? trimmed;
}

interface ParsedRow {
  raw: Record<string, string>;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  activity_type: string;
  skill_level: string;
  gender: string;
  age_min: string;
  age_max: string;
  price_cents: string;
  currency: string;
  capacity: string;
  description: string;
  gear_rules: string;
}

interface RowResult {
  row: ParsedRow;
  csvRowNumber: number; // 1-indexed, matches what the operator sees in Excel
  errors: string[];
}

function parseDayOfWeek(input: string): { value: number | null; err?: string } {
  const s = input.trim().toLowerCase();
  if (s === '') return { value: null, err: 'Missing day_of_week' };
  const asNum = Number(s);
  if (Number.isInteger(asNum) && asNum >= 0 && asNum <= 6) return { value: asNum };
  // Day name lookups: "mon" / "monday" / "MONDAY".
  const byName = DAYS.findIndex(d => d.toLowerCase() === s || d.toLowerCase().slice(0, 3) === s);
  if (byName >= 0) return { value: byName };
  return { value: null, err: `day_of_week "${input}" must be 0-6 or day name.` };
}

function validateParsedRow(row: ParsedRow, csvRowNumber: number): RowResult {
  const errors: string[] = [];
  if (row.day_of_week === null) errors.push('day_of_week is required (0-6 or Sun..Sat).');
  if (!row.start_time) errors.push('start_time is required (HH:MM).');
  else if (!/^\d{1,2}:\d{2}/.test(row.start_time)) errors.push(`start_time "${row.start_time}" must be HH:MM.`);
  if (!row.end_time) errors.push('end_time is required (HH:MM).');
  else if (!/^\d{1,2}:\d{2}/.test(row.end_time)) errors.push(`end_time "${row.end_time}" must be HH:MM.`);
  if (row.start_time && row.end_time && /^\d{1,2}:\d{2}/.test(row.start_time) && /^\d{1,2}:\d{2}/.test(row.end_time)) {
    const norm = (t: string) => t.slice(0, 5);
    if (norm(row.start_time) >= norm(row.end_time)) errors.push('end_time must be after start_time.');
  }
  if (!row.activity_type) errors.push('activity_type is required.');
  else if (!(ACTIVITY_TYPES as readonly string[]).includes(row.activity_type)) errors.push(`activity_type "${row.activity_type}" not recognized.`);

  if (row.skill_level && !(SKILL_LEVELS as readonly string[]).includes(row.skill_level)) {
    errors.push(`skill_level "${row.skill_level}" must be one of ${SKILL_LEVELS.join('/')}.`);
  }
  if (row.gender && !(GENDERS as readonly string[]).includes(row.gender)) {
    errors.push(`gender "${row.gender}" must be one of ${GENDERS.join('/')}.`);
  }

  if (row.age_min && (!/^\d+$/.test(row.age_min) || Number(row.age_min) > 99)) {
    errors.push(`age_min "${row.age_min}" must be 0-99 or empty.`);
  }
  if (row.age_max && (!/^\d+$/.test(row.age_max) || Number(row.age_max) > 99)) {
    errors.push(`age_max "${row.age_max}" must be 0-99 or empty.`);
  }
  if (row.age_min && row.age_max && Number(row.age_min) > Number(row.age_max)) {
    errors.push('age_min must be <= age_max.');
  }

  if (row.price_cents && !/^[\d.,$ ]+$/.test(row.price_cents)) {
    errors.push(`price_cents "${row.price_cents}" must be a number (5.00 or 500).`);
  }

  if (row.capacity && (!/^\d+$/.test(row.capacity) || Number(row.capacity) <= 0)) {
    errors.push(`capacity "${row.capacity}" must be a positive integer or empty.`);
  }

  if (row.currency && row.currency.length !== 3) {
    errors.push(`currency "${row.currency}" must be a 3-letter code (USD, CAD, ...).`);
  }

  return { row, csvRowNumber, errors };
}

function formatTime(t: string): string {
  if (!t) return '';
  // Normalize to HH:MM for display (operators export times as "07:30:00" sometimes).
  return t.slice(0, 5);
}

export default function ImportForm({ rinkId, rinkName }: { rinkId: string; rinkName: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [filename, setFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<RowResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: { row: number; error: string }[] } | null>(null);

  const stats = useMemo(() => {
    if (!parsed) return null;
    const valid = parsed.filter(r => r.errors.length === 0);
    const invalid = parsed.filter(r => r.errors.length > 0);
    return { valid, invalid, total: parsed.length };
  }, [parsed]);

  function reset() {
    setFilename(null);
    setParsed(null);
    setParseError(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setParseError('CSV is empty.');
          setParsed(null);
          return;
        }
        const headers = rows[0].map(h => normalizeHeader(h));
        const missing = EXPECTED_COLUMNS.filter(c => !headers.includes(c));
        // Only complain if the truly-required columns are missing. Optional ones
        // (age_min, capacity, currency, description, gear_rules) can be omitted.
        const trulyMissing = missing.filter((m) => m !== 'description' && m !== 'gear_rules');
        if (trulyMissing.length > 0) {
          setParseError(
            `Missing required column(s): ${trulyMissing.join(', ')}. ` +
            `Expected header row: ${EXPECTED_COLUMNS.join(',')}.`,
          );
          setParsed(null);
          return;
        }
        const dataRows = rows.slice(1);
        const results: RowResult[] = dataRows.map((cells, idx) => {
          const rawObj: Record<string, string> = {};
          headers.forEach((h, i) => { rawObj[h] = cells[i] ?? ''; });
          const dayParsed = parseDayOfWeek(rawObj.day_of_week ?? '');
          const parsed: ParsedRow = {
            raw: rawObj,
            day_of_week: dayParsed.value,
            start_time: (rawObj.start_time ?? '').trim(),
            end_time: (rawObj.end_time ?? '').trim(),
            activity_type: (rawObj.activity_type ?? '').trim(),
            skill_level: (rawObj.skill_level ?? '').trim(),
            gender: (rawObj.gender ?? '').trim(),
            age_min: (rawObj.age_min ?? '').trim(),
            age_max: (rawObj.age_max ?? '').trim(),
            price_cents: (rawObj.price_cents ?? '').trim(),
            currency: (rawObj.currency ?? '').trim().toUpperCase(),
            capacity: (rawObj.capacity ?? '').trim(),
            description: (rawObj.description ?? '').trim(),
            gear_rules: (rawObj.gear_rules ?? '').trim(),
          };
          const validation = validateParsedRow(parsed, idx + 2); // +2: header is row 1, data starts row 2
          if (dayParsed.err && !validation.errors.some(e => e.startsWith('day_of_week'))) {
            validation.errors.unshift(dayParsed.err);
          }
          return validation;
        });
        setParseError(null);
        setParsed(results);
      } catch (err) {
        setParseError(`Failed to read file: ${(err as Error).message}`);
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }

  async function submit() {
    if (!stats || stats.valid.length === 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        rows: stats.valid.map(({ row }) => ({
          day_of_week: row.day_of_week,
          start_time: row.start_time.length === 5 ? row.start_time : row.start_time,
          end_time: row.end_time,
          activity_type: row.activity_type,
          skill_level: row.skill_level || 'all',
          gender: row.gender || 'all',
          age_min: row.age_min === '' ? null : Number(row.age_min),
          age_max: row.age_max === '' ? null : Number(row.age_max),
          price_cents: row.price_cents === '' ? null : row.price_cents,
          currency: row.currency || 'USD',
          capacity: row.capacity === '' ? null : Number(row.capacity),
          description: row.description || null,
          gear_rules: row.gear_rules || null,
          status: 'draft',
        })),
      };
      const res = await fetch(`/api/owner/rinks/${rinkId}/programming/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ inserted: 0, failed: [{ row: 0, error: j.error || `Server error (${res.status}).` }] });
        setSubmitting(false);
        return;
      }
      setResult({ inserted: j.inserted ?? 0, failed: j.failed ?? [] });
      setSubmitting(false);
    } catch (err) {
      setResult({ inserted: 0, failed: [{ row: 0, error: (err as Error).message }] });
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Step 1: pick a file */}
      <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          1 · Choose a CSV file
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.875rem' }}>
          First row is column names. Required: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>day_of_week</code>,{' '}
          <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>start_time</code>,{' '}
          <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>end_time</code>,{' '}
          <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>activity_type</code>.
          The other columns can be omitted.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '0.5rem 0.75rem',
              color: '#fff',
              fontSize: '0.85rem',
              maxWidth: 360,
            }}
          />
          {filename && (
            <button
              type="button"
              onClick={reset}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: '#94A3B8', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
        {parseError && (
          <div style={{ marginTop: '0.875rem', background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,28,0.4)', color: '#FF6B7A', padding: '0.625rem 0.875rem', borderRadius: 6, fontSize: '0.85rem' }}>
            {parseError}
          </div>
        )}
      </div>

      {/* Step 2: preview */}
      {stats && (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2 · Preview
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC', padding: '0.2rem 0.625rem', borderRadius: 999 }}>
                {stats.valid.length} valid
              </span>
              <span style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)', color: '#FCA5A5', padding: '0.2rem 0.625rem', borderRadius: 999 }}>
                {stats.invalid.length} with errors
              </span>
              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: '#94A3B8', padding: '0.2rem 0.625rem', borderRadius: 999 }}>
                {stats.total} total
              </span>
            </div>
          </div>

          {/* Preview table — first 5 rows of valid + all invalid (with errors). */}
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Row</th>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Day</th>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Time</th>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Activity</th>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Skill/Gender</th>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Price</th>
                  <th style={{ padding: '0.5rem 0.625rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.valid.slice(0, 5).map((r) => (
                  <tr key={`v-${r.csvRowNumber}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#94A3B8' }}>{r.csvRowNumber}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#fff' }}>{r.row.day_of_week !== null ? DAYS[r.row.day_of_week] : '—'}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#fff' }}>{formatTime(r.row.start_time)}–{formatTime(r.row.end_time)}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#cbd5e1' }}>{r.row.activity_type.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#94A3B8' }}>
                      {r.row.skill_level || 'all'}{r.row.gender && r.row.gender !== 'all' ? ` · ${r.row.gender}` : ''}
                    </td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#cbd5e1' }}>
                      {r.row.price_cents ? `${r.row.currency || 'USD'} ${r.row.price_cents}` : 'Free'}
                    </td>
                    <td style={{ padding: '0.5rem 0.625rem' }}>
                      <span style={{ background: 'rgba(56,189,248,0.15)', color: '#7DD3FC', padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 }}>
                        OK
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.valid.length > 5 && (
                  <tr style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td colSpan={7} style={{ padding: '0.5rem 0.625rem', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }}>
                      … {stats.valid.length - 5} more valid rows (will import on submit)
                    </td>
                  </tr>
                )}
                {stats.invalid.map((r) => (
                  <tr key={`e-${r.csvRowNumber}`} style={{ borderTop: '1px solid rgba(200,16,46,0.2)', background: 'rgba(200,16,46,0.04)' }}>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5' }}>{r.csvRowNumber}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5' }}>{(r.row.day_of_week ?? '—') as any}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5' }}>{formatTime(r.row.start_time)}–{formatTime(r.row.end_time)}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5' }}>{r.row.activity_type || '—'}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5' }}>{r.row.skill_level || '—'}{r.row.gender && r.row.gender !== 'all' ? ` · ${r.row.gender}` : ''}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5' }}>{r.row.price_cents || '—'}</td>
                    <td style={{ padding: '0.5rem 0.625rem', color: '#FCA5A5', fontSize: '0.75rem' }}>
                      {r.errors.join(' · ')}
                    </td>
                  </tr>
                ))}
                {stats.valid.length === 0 && stats.invalid.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>
                      No data rows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || stats.valid.length === 0}
              style={{
                background: stats.valid.length === 0 ? 'rgba(255,255,255,0.05)' : '#38BDF8',
                color: stats.valid.length === 0 ? '#64748B' : '#0F172A',
                border: 'none',
                borderRadius: 8,
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: stats.valid.length === 0 || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Importing…' : `Import ${stats.valid.length} row${stats.valid.length === 1 ? '' : 's'} (as drafts)`}
            </button>
            <Link
              href={`/dashboard/manage/rink/${rinkId}/programming/quick`}
              style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
            >
              Switch to quick-add →
            </Link>
          </div>
        </div>
      )}

      {/* Step 3: result */}
      {result && (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            3 · Result
          </h2>
          {result.inserted > 0 ? (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#86EFAC', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.9rem', marginBottom: '0.875rem' }}>
              ✅ Imported {result.inserted} programming row{result.inserted === 1 ? '' : 's'} for {rinkName} (visible as drafts until published).
            </div>
          ) : result.failed.length === 1 && result.failed[0].row === 0 ? (
            <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,28,0.4)', color: '#FF6B7A', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.9rem' }}>
              {result.failed[0].error}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FCD34D', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.9rem' }}>
              Nothing was imported. Fix the rows above and try again.
            </div>
          )}
          {result.failed.length > 0 && result.inserted > 0 && (
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ color: '#FCA5A5', fontSize: '0.85rem', cursor: 'pointer' }}>
                {result.failed.length} row{result.failed.length === 1 ? '' : 's'} rejected by server (skipping)
              </summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: '#94A3B8', fontSize: '0.8rem' }}>
                {result.failed.map((f) => (
                  <li key={f.row}>row {f.row}: {f.error}</li>
                ))}
              </ul>
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Link
              href={`/dashboard/manage/rink/${rinkId}/programming`}
              style={{ background: '#38BDF8', color: '#0F172A', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
            >
              View programming →
            </Link>
            <button
              type="button"
              onClick={reset}
              style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Import another file
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              style={{ background: 'transparent', color: '#94A3B8', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Help block — sample CSV */}
      <details style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <summary style={{ color: '#7DD3FC', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
          Need a starter CSV? See column reference + sample
        </summary>
        <div style={{ marginTop: '0.875rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>day_of_week</strong> — 0 (Sun) through 6 (Sat), or day name (Monday, mon, etc.).
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>start_time / end_time</strong> — 24-hour <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px' }}>HH:MM</code>. Must end &gt; start.
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>activity_type</strong> — one of: {ACTIVITY_TYPES.map(t => <code key={t} style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', margin: '0 2px' }}>{t}</code>)}.
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>skill_level</strong> — all | beginner | intermediate | advanced | elite (default <em>all</em>).
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>gender</strong> — all | boys | girls | men | women | coed (default <em>all</em>).
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>age_min / age_max</strong> — 0–99 or empty.
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>price_cents</strong> — accepts <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px' }}>5.00</code> or <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px' }}>500</code> (cents). Empty = free.
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>currency</strong> — 3-letter code (default <em>USD</em>).
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>capacity</strong> — positive integer or empty.
          </p>
          <p style={{ marginBottom: '0.625rem' }}>
            <strong style={{ color: '#fff' }}>description / gear_rules</strong> — optional free text.
          </p>
          <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem', overflowX: 'auto', fontSize: '0.75rem', marginTop: '0.75rem' }}>
{`day_of_week,start_time,end_time,activity_type,skill_level,gender,price_cents,currency,capacity,description
1,19:00,20:00,public_skate,all,all,,,,
1,20:30,22:00,stick_and_puck,all,all,8.00,USD,30,Drop-in; full gear required.
3,16:00,16:45,learn_to_skate,beginner,coed,12.00,USD,20,Free skate rental with admission.`}
          </pre>
        </div>
      </details>
    </div>
  );
}