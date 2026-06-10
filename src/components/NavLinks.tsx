'use client';
import { useEffect, useRef, useState } from 'react';
import DesktopMenuPanel from './DesktopMenuPanel';

/**
 * Desktop nav menu — a single "Menu" button (hamburger + label) that
 * toggles a wide dropdown panel containing all nav sections in a
 * 3-column grid. Replaces the previous row of 8 horizontal section
 * labels that overflowed the viewport on smaller desktop screens.
 *
 * The panel:
 *   - Closes when a link inside it is clicked
 *   - Closes on Escape key
 *   - Closes on outside click
 *
 * Mobile (<768px) hides this component entirely; the mobile drawer
 * (MobileNav) handles navigation on small screens.
 */
export default function NavLinks() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div className="nav-links" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`nav-menu-button${open ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <span className="nav-menu-button__bars" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="nav-menu-button__label">Menu</span>
        <svg
          className="nav-menu-button__chevron"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      {open && (
        <DesktopMenuPanel onNavigate={() => setOpen(false)} />
      )}
    </div>
  );
}
