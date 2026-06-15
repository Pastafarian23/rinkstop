'use client';

import { useState, useEffect, useRef } from 'react';
import { contentToHtml, wordCount } from '@/lib/markdown';

interface Props {
  open: boolean;
  initialContent: string;
  saving?: boolean;
  onSave: (newContent: string) => void;
  onClose: () => void;
}

/**
 * Full-screen body editor. Two-pane:
 *   - Left: markdown source (textarea)
 *   - Right: live HTML preview using the same renderer as the public page
 *
 * Reviewer uses this to fix AI mistakes in the body (wrong stat, hallucinated
 * quote, etc.) before promoting. The audit trail in post_review_edits captures
 * exactly what changed.
 */
export default function BodyEditor({ open, initialContent, saving, onSave, onClose }: Props) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setContent(initialContent);
  }, [open, initialContent]);

  // Esc closes (only when not saving)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const html = contentToHtml(content);
  const wc = wordCount(content);
  const changed = content !== initialContent;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#020617',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.95rem', color: 'white', fontWeight: 600 }}>📝 Body editor</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            {wc.toLocaleString()} words · ~{Math.max(1, Math.round(wc / 220))} min read
          </span>
          {changed && (
            <span style={{ fontSize: '0.7rem', color: '#FACC15', padding: '2px 8px', background: 'rgba(250,204,21,0.1)', borderRadius: 4 }}>
              Unsaved
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
            onClick={() => onSave(content)}
            className="admin-btn admin-btn-primary"
            disabled={saving || !changed}
          >
            {saving ? 'Saving…' : 'Save body'}
          </button>
        </div>
      </div>

      {/* Two-pane editor */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            Markdown source
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              padding: '1.25rem',
              background: 'transparent',
              border: 0,
              outline: 'none',
              resize: 'none',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.85rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              lineHeight: 1.6,
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            Live preview (matches public page)
          </div>
          <div
            className="news-content"
            style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
