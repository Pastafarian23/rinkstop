'use client';

import { useState, useRef, useEffect, useId } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  name: string;
  value: string;
  options: DropdownOption[];
  /** Optional hidden input name override. Defaults to `name`. */
  hiddenName?: string;
  /** Aria label for the trigger button. Defaults to the name prop. */
  ariaLabel?: string;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
}

export default function Dropdown({
  name,
  value,
  options,
  hiddenName,
  ariaLabel,
  placeholder = 'Select…',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const current = options.find((o) => o.value === value);
  const displayLabel = current ? current.label : placeholder;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIdx(-1);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  function selectOption(opt: DropdownOption) {
    // Submit the parent form if we are inside one (the plans filter form is GET)
    // We achieve this by writing a hidden input + submitting the closest <form>.
    const form = containerRef.current?.closest('form');
    if (!form) {
      setOpen(false);
      return;
    }
    let hidden = form.querySelector<HTMLInputElement>(`input[type="hidden"][data-dropdown-for="${name}"]`);
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = hiddenName ?? name;
      hidden.dataset.dropdownFor = name;
      form.appendChild(hidden);
    }
    hidden.value = opt.value;
    form.submit();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
      if (!open) {
        // focus first option on open
        setFocusedIdx(options.findIndex((o) => o.value === value));
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIdx(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setFocusedIdx((idx) => Math.min(idx + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      setFocusedIdx((idx) => Math.max(idx - 1, 0));
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIdx >= 0 && focusedIdx < options.length) {
        selectOption(options[focusedIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((idx) => Math.min(idx + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIdx(-1);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? name}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '0.6rem 0.85rem',
          background: '#0D1117',
          border: `1px solid ${open ? '#FFB81C' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 6,
          color: current ? '#fff' : 'rgba(255,255,255,0.55)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
            color: open ? '#FFB81C' : 'rgba(255,255,255,0.55)',
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          ref={(el) => {
            if (el && focusedIdx >= 0) {
              const child = el.children[focusedIdx] as HTMLElement | undefined;
              child?.scrollIntoView({ block: 'nearest' });
            }
          }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            margin: 0,
            padding: '4px 0',
            listStyle: 'none',
            background: '#0D1117',
            border: '1px solid rgba(255,184,28,0.4)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIdx;
            return (
              <li
                key={opt.value || '__empty__'}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIdx(idx)}
                onClick={() => selectOption(opt)}
                style={{
                  padding: '0.55rem 0.85rem',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: isSelected ? '#FFB81C' : '#fff',
                  background: isFocused ? 'rgba(255,184,28,0.08)' : 'transparent',
                  fontWeight: isSelected ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  userSelect: 'none',
                }}
              >
                {isSelected && (
                  <span aria-hidden="true" style={{ fontSize: 11, color: '#FFB81C' }}>✓</span>
                )}
                <span>{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}