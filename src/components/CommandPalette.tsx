'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SearchBar from './SearchBar';

/**
 * CommandPalette — Cmd+K / Ctrl+K global search modal.
 *
 * Mounts a full-screen backdrop + centered search panel via React portal.
 * Listens for Cmd+K (Mac) / Ctrl+K (Win/Linux) globally on every page.
 * Press Escape inside SearchBar to close. Click backdrop to close.
 *
 * Uses the shared SearchBar component with source='command_palette'.
 * Recent searches are fetched from /api/profile/search-history when opened.
 */
export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for programmatic open/close from SearchBar (Escape key)
  useEffect(() => {
    function handleOpen() { setIsOpen(true); }
    function handleClose() { setIsOpen(false); }
    document.addEventListener('open-command-palette', handleOpen);
    document.addEventListener('close-command-palette', handleClose);
    return () => {
      document.removeEventListener('open-command-palette', handleOpen);
      document.removeEventListener('close-command-palette', handleClose);
    };
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      {/* Stop propagation so clicking the panel doesn't close it */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#0a0a0a',
          border: '1.5px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          margin: '0 1rem',
        }}
      >
        <div style={{ padding: '0.75rem 1rem' }}>
          <SearchBar
            source="command_palette"
            autoFocus
          />
        </div>
        {/* Hint footer */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto' }}>RinkStop Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
