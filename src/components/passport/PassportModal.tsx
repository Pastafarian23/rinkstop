'use client';

/**
 * PassportModal — generic modal shell for inline passport forms.
 *
 * Used by StatsFormModal, CareerHistoryFormModal, etc. when owner clicks
 * '+ Add' on a passport section. Renders a centered overlay with a
 * dismiss button, traps focus, closes on Escape or backdrop click.
 *
 * Pure shell — body content comes from `children`.
 *
 * Rules of hooks (2026-08-28 fix): all hooks run unconditionally before
 * any early returns. Visibility (open/closed) is controlled by the
 * `open` prop and rendered conditionally.
 */

import { useEffect, useRef } from 'react';

interface PassportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional max width (default 560px). */
  maxWidth?: number;
}

export default function PassportModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 560,
}: PassportModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="passport-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 950,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        // Close when the backdrop itself is clicked (not the dialog).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          background: '#0a1f3d',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 12,
          padding: '1.5rem',
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 4rem)',
          overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2
            id="passport-modal-title"
            className="font-sport"
            style={{
              fontSize: '1.125rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
