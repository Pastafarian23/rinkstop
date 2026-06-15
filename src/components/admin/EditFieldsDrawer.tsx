'use client';

import { useState, useEffect } from 'react';

interface PostFields {
  title: string;
  subtitle: string | null;
  category: string | null;
  tags: string[];
}

interface Props {
  open: boolean;
  initial: PostFields;
  saving?: boolean;
  onSave: (changes: { title?: string; subtitle?: string | null; category?: string | null; tags?: string[] }) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'blog', label: 'Blog' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'global-scenes', label: 'Local Scenes' },
  { value: 'youth-hockey', label: 'Youth Hockey' },
  { value: 'industry', label: 'Industry' },
  { value: 'news', label: 'News' },
  { value: 'guide', label: 'Guide' },
];

/**
 * Slide-in drawer for editing the small text fields (title, subtitle,
 * category, tags). The body has its own full-screen editor.
 *
 * On save, only fields that actually changed are sent back. The parent
 * merges them into the review payload.
 */
export default function EditFieldsDrawer({ open, initial, saving, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle || '');
  const [category, setCategory] = useState(initial.category || '');
  const [tagsRaw, setTagsRaw] = useState((initial.tags || []).join(', '));

  // Re-sync when the drawer is reopened (different post)
  useEffect(() => {
    if (open) {
      setTitle(initial.title);
      setSubtitle(initial.subtitle || '');
      setCategory(initial.category || '');
      setTagsRaw((initial.tags || []).join(', '));
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSave = () => {
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    const changes: any = {};
    if (title !== initial.title) changes.title = title;
    if (subtitle !== (initial.subtitle || '')) changes.subtitle = subtitle || null;
    if (category !== (initial.category || '')) changes.category = category || null;
    if (JSON.stringify(tags) !== JSON.stringify(initial.tags || [])) changes.tags = tags;
    onSave(changes);
  };

  const hasChanges =
    title !== initial.title ||
    subtitle !== (initial.subtitle || '') ||
    category !== (initial.category || '') ||
    tagsRaw !== (initial.tags || []).join(', ');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 60,
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(560px, 100vw)',
          background: '#0F172A',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>✏️ Edit fields</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: 4,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Subtitle">
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="(optional)"
              style={inputStyle}
            />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              <option value="">(none)</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="rinkstop, blog, beer-league"
              style={inputStyle}
            />
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Preview: {tagsRaw.split(',').map((t) => t.trim()).filter(Boolean).map((t) => `#${t}`).join(' ') || '(empty)'}
            </div>
          </Field>
        </div>

        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="admin-btn admin-btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="admin-btn admin-btn-primary"
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  color: 'white',
  fontSize: '0.9rem',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
