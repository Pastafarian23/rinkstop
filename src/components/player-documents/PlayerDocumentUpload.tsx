'use client';

/**
 * PlayerDocumentUpload — Phase 1b-1 (Player Documents)
 * Approved by Arnel 2026-07-06 07:33 CDT (Telegram msg #32742).
 *
 * Client component. Two-stage upload UX:
 *
 *   1. FORM stage
 *      - Multi-file picker (1-5 files per batch, server-enforced)
 *      - Per-file metadata: category (7 enum values), title (1-100 chars),
 *        description (optional, <=500 chars), expires_at (optional, only for
 *        waiver/medical_form/vaccination_record)
 *      - All files in the batch target the same player (one batch = one
 *        child, per Q7 follow-up defaults at 2026-07-06 07:07 CDT)
 *      - "Review" button transitions to stage 2
 *
 *   2. REVIEW stage
 *      - Lists each staged file with its metadata
 *      - Edit-in-place: category, title, description, expires_at
 *      - Re-pick: each row has a "Replace file" button that swaps the file
 *        and reads its new size / mime / name
 *      - Remove file from batch: per-row trash button
 *      - Cancel: clears the entire batch (no partial state)
 *      - Save: single POST to /api/player-documents with all files
 *      - Per Q7 follow-up: all-or-nothing Save with no server-side staging.
 *        A batch failure rolls back any partial state server-side; the UI
 *        surfaces the error and the user can retry or cancel.
 *
 * Per Q12 read (a): if managed_profiles.minor_consent_revoked_at is set on
 * this player, the form shows a consent checkbox at the top of the review
 * stage. The user must tick it before "Save" enables. The server writes
 * parent_consent_at = NOW() and clears minor_consent_revoked_at in the same
 * upload. (Defensive: we do not depend on managed_profiles having a
 * parent_consent_method column — see MEMORY.md / 2026-07-06-fabrication-recap.)
 *
 * After a successful Save, onUpload() fires and the parent re-fetches the
 * list. The local form is reset.
 */

import { useRef, useState } from 'react';

const MAX_FILES = 5;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
]);

const CATEGORY_OPTIONS = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'waiver', label: 'Waiver' },
  { value: 'medical_form', label: 'Medical Form' },
  { value: 'vaccination_record', label: 'Vaccination Record' },
  { value: 'proof_of_residence', label: 'Proof of Residence' },
  { value: 'photo_id', label: 'Photo ID' },
  { value: 'other', label: 'Other' },
];
const EXPIRY_ALLOWED_CATEGORIES = new Set([
  'waiver',
  'medical_form',
  'vaccination_record',
]);

interface StagedItem {
  /** Internal id used to key the review list (separate from the future
   *  server document id, which is created at upload time). */
  localId: string;
  file: File;
  category: string;
  title: string;
  description: string;
  expires_at: string;
}

interface PlayerDocumentUploadProps {
  playerId: string;
  /** True when the linked managed_profiles row has minor_consent_revoked_at
   *  set (we trust the parent's declaration on this form, then re-assert
   *  consent server-side via the upload). */
  consentRevoked?: boolean;
  /** Called after a successful upload so the parent can re-fetch the list. */
  onUpload?: () => void;
  /** Cancel button: collapse the form back to its trigger. */
  onCancel?: () => void;
}

export default function PlayerDocumentUpload({
  playerId,
  consentRevoked = false,
  onUpload,
  onCancel,
}: PlayerDocumentUploadProps) {
  type Stage = 'idle' | 'form' | 'review' | 'saving';
  const [stage, setStage] = useState<Stage>('idle');
  const [items, setItems] = useState<StagedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setItems([]);
    setError(null);
    setConsentChecked(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStage('idle');
  }

  function handleCancel() {
    reset();
    onCancel?.();
  }

  function handlePickFiles() {
    fileInputRef.current?.click();
  }

  function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const incoming = Array.from(files);
    const allowedSlots = MAX_FILES - items.length;
    if (incoming.length > allowedSlots) {
      setError(
        `You can upload at most ${MAX_FILES} documents per batch. You tried to add ${incoming.length}; there are only ${allowedSlots} slots left.`
      );
      return;
    }
    // Per-file validate on entry.
    for (const f of incoming) {
      if (f.size <= 0 || f.size > MAX_BYTES) {
        setError(
          `"${f.name}" is too large. Max is ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB; got ${(f.size / 1024 / 1024).toFixed(2)} MB.`
        );
        return;
      }
      if (!ALLOWED_MIME.has(f.type)) {
        setError(
          `"${f.name}" is not a supported file type. Allowed: PDF, JPEG, PNG, HEIC, WebP. Got: ${f.type || 'unknown'}.`
        );
        return;
      }
    }

    const newItems: StagedItem[] = incoming.map((file) => ({
      localId: crypto.randomUUID(),
      file,
      category: defaultCategoryForMime(file.type),
      title: stripExtension(file.name).slice(0, 100),
      description: '',
      expires_at: '',
    }));
    setItems((prev) => [...prev, ...newItems]);
    setStage('form');
  }

  function updateItem(localId: string, patch: Partial<StagedItem>) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it))
    );
  }

  function replaceFile(localId: string) {
    // Create a one-shot file input; on pick, swap the file in state.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = Array.from(ALLOWED_MIME).join(',');
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > MAX_BYTES) {
        setError(
          `"${f.name}" is too large. Max is ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`
        );
        return;
      }
      if (!ALLOWED_MIME.has(f.type)) {
        setError(`"${f.name}" is not a supported file type.`);
        return;
      }
      updateItem(localId, {
        file: f,
        title: stripExtension(f.name).slice(0, 100),
        category: defaultCategoryForMime(f.type),
      });
    };
    input.click();
  }

  function removeItem(localId: string) {
    setItems((prev) => {
      const next = prev.filter((it) => it.localId !== localId);
      if (next.length === 0) {
        setStage('idle');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return next;
    });
  }

  function validateForReview(): string | null {
    if (items.length === 0) return 'Add at least one document before reviewing.';
    for (const it of items) {
      if (!it.title.trim()) return `Each document needs a title. "${it.file.name}" does not.`;
      if (it.title.length > 100) return `Title for "${it.file.name}" is too long (100 char max).`;
      if (it.description.length > 500)
        return `Description for "${it.file.name}" is too long (500 char max).`;
      if (!ALLOWED_CATEGORIES.has(it.category))
        return `Pick a category for "${it.file.name}".`;
      if (it.expires_at && !EXPIRY_ALLOWED_CATEGORIES.has(it.category)) {
        return `"${it.file.name}" has an expiry date but its category (${it.category}) does not support one. Clear the date or change the category.`;
      }
      if (it.expires_at && !/^\d{4}-\d{2}-\d{2}$/.test(it.expires_at)) {
        return `Expiry date for "${it.file.name}" must be in YYYY-MM-DD format.`;
      }
    }
    return null;
  }

  function handleReview() {
    const err = validateForReview();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStage('review');
  }

  async function handleSave() {
    if (consentRevoked && !consentChecked) {
      setError('Please re-confirm parent consent before saving.');
      return;
    }
    const err = validateForReview();
    if (err) {
      setError(err);
      return;
    }
    if (!playerId) {
      setError('No player selected. Go back and pick a child to upload for.');
      return;
    }

    setError(null);
    setStage('saving');

    try {
      const fd = new FormData();
      fd.set('player_id', playerId);
      items.forEach((it) => fd.append('files', it.file));
      items.forEach((it, idx) => {
        fd.set(`items[${idx}][category]`, it.category);
        fd.set(`items[${idx}][title]`, it.title.trim());
        if (it.description.trim()) fd.set(`items[${idx}][description]`, it.description.trim());
        if (it.expires_at && EXPIRY_ALLOWED_CATEGORIES.has(it.category)) {
          fd.set(`items[${idx}][expires_at]`, it.expires_at);
        }
      });

      const res = await fetch('/api/player-documents', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Upload failed (${res.status})`);
      }

      // Success — clear local form and let parent refetch.
      reset();
      onUpload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('review');
    }
  }

  if (stage === 'idle') {
    return (
      <div data-testid="player-document-upload-idle">
        <button
          type="button"
          onClick={handlePickFiles}
          style={{
            padding: '0.6rem 1rem',
            background: '#14B8A6',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Upload documents
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Array.from(ALLOWED_MIME).join(',')}
          style={{ display: 'none' }}
          onChange={(e) => handleFilesPicked(e.target.files)}
        />
        <p
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.72rem',
            margin: '0.5rem 0 0',
          }}
        >
          PDF, JPEG, PNG, HEIC, WebP. Max {(MAX_BYTES / 1024 / 1024).toFixed(0)} MB per file,
          {' '}{MAX_FILES} files per batch.
        </p>
        {error ? (
          <div
            role="alert"
            style={{
              marginTop: 8,
              padding: '0.5rem 0.75rem',
              background: 'rgba(200,16,46,0.12)',
              border: '1px solid rgba(200,16,46,0.4)',
              borderRadius: 6,
              color: '#FF6B7A',
              fontSize: '0.8rem',
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  if (stage === 'saving') {
    return (
      <div
        data-testid="player-document-upload-saving"
        style={{
          padding: '1.25rem 1rem',
          background: '#0a0a0a',
          border: '1px solid #141414',
          borderRadius: 10,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9rem',
        }}
      >
        Uploading&hellip;
      </div>
    );
  }

  // form / review stages: show the staged rows.
  return (
    <div data-testid={`player-document-upload-${stage}`}>
      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.65rem 0.85rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 8,
            color: '#FF6B7A',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          {error}
        </div>
      ) : null}

      <ul
        style={{
          listStyle: 'none',
          margin: '0 0 0.75rem',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {items.map((it) => (
          <li
            key={it.localId}
            data-testid="player-document-staged-row"
            style={{
              padding: '0.75rem 0.85rem',
              background: '#0a0a0a',
              border: '1px solid #141414',
              borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span aria-hidden style={{ fontSize: '1rem' }}>
                {it.file.type === 'application/pdf' ? '📄' : '🖼️'}
              </span>
              <span
                style={{
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={it.file.name}
              >
                {it.file.name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
                {(it.file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={() => replaceFile(it.localId)}
                title="Replace this file"
                style={{
                  padding: '0.3rem 0.55rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => removeItem(it.localId)}
                title="Remove from batch"
                style={{
                  padding: '0.3rem 0.55rem',
                  background: 'transparent',
                  border: '1px solid rgba(200,16,46,0.35)',
                  borderRadius: 4,
                  color: '#FF6B7A',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
              }}
            >
              <label style={{ display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.7rem',
                    marginBottom: 2,
                  }}
                >
                  Category
                </span>
                <select
                  value={it.category}
                  onChange={(e) => updateItem(it.localId, { category: e.target.value })}
                  style={inputStyle}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.7rem',
                    marginBottom: 2,
                  }}
                >
                  Title (required)
                </span>
                <input
                  type="text"
                  value={it.title}
                  maxLength={100}
                  onChange={(e) => updateItem(it.localId, { title: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'block', gridColumn: '1 / -1' }}>
                <span
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.7rem',
                    marginBottom: 2,
                  }}
                >
                  Description (optional)
                </span>
                <textarea
                  value={it.description}
                  maxLength={500}
                  onChange={(e) => updateItem(it.localId, { description: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              {EXPIRY_ALLOWED_CATEGORIES.has(it.category) ? (
                <label style={{ display: 'block' }}>
                  <span
                    style={{
                      display: 'block',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.7rem',
                      marginBottom: 2,
                    }}
                  >
                    Expires (optional)
                  </span>
                  <input
                    type="date"
                    value={it.expires_at}
                    onChange={(e) => updateItem(it.localId, { expires_at: e.target.value })}
                    style={inputStyle}
                  />
                </label>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {stage === 'form' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePickFiles}
            disabled={items.length >= MAX_FILES}
            style={{
              padding: '0.55rem 0.95rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.85rem',
              cursor: items.length >= MAX_FILES ? 'not-allowed' : 'pointer',
              opacity: items.length >= MAX_FILES ? 0.5 : 1,
            }}
          >
            + Add more ({MAX_FILES - items.length} slots left)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Array.from(ALLOWED_MIME).join(',')}
            style={{ display: 'none' }}
            onChange={(e) => handleFilesPicked(e.target.files)}
          />
          <button
            type="button"
            onClick={handleReview}
            style={{
              padding: '0.55rem 0.95rem',
              background: '#14B8A6',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Review →
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '0.55rem 0.95rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {stage === 'review' ? (
        <div data-testid="player-document-review-panel">
          {consentRevoked ? (
            <label
              data-testid="player-document-consent-checkbox"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '0.65rem 0.85rem',
                background: '#0a0a0a',
                border: '1px solid rgba(255,184,28,0.4)',
                borderRadius: 8,
                marginBottom: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                }}
              >
                I confirm I am the parent/guardian of this player and consent to uploading
                these documents to RinkStop.
              </span>
            </label>
          ) : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={consentRevoked && !consentChecked}
              style={{
                padding: '0.6rem 1.15rem',
                background: '#14B8A6',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: consentRevoked && !consentChecked ? 'not-allowed' : 'pointer',
                opacity: consentRevoked && !consentChecked ? 0.5 : 1,
              }}
            >
              Save {items.length} document{items.length === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '0.6rem 1.15rem',
                background: 'transparent',
                border: '1px solid rgba(200,16,46,0.4)',
                borderRadius: 6,
                color: '#FF6B7A',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.4rem 0.55rem',
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  borderRadius: 4,
  color: '#fff',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
};

const ALLOWED_CATEGORIES = new Set(CATEGORY_OPTIONS.map((o) => o.value));

function defaultCategoryForMime(mime: string): string {
  if (mime === 'application/pdf') return 'waiver';
  if (mime.startsWith('image/')) return 'photo_id';
  return 'other';
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}
