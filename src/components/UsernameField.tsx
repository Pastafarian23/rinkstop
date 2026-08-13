'use client';

import { useState, useEffect, useCallback } from 'react';
import { USERNAME_ERROR_MESSAGES, type UsernameError } from '@/lib/username';

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'unavailable'; reason: UsernameError; message: string; suggestions?: string[] };

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * Reusable username input with live availability checking.
 * Debounced 300ms. Shows status, error messages, and clickable suggestions.
 */
export default function UsernameField({
  value,
  onChange,
  disabled = false,
  disabledReason,
  autoFocus = false,
  placeholder = 'username',
}: Props) {
  const [state, setState] = useState<AvailabilityState>({ status: 'idle' });

  const checkAvailability = useCallback(async (slug: string) => {
    if (!slug.trim()) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'checking' });

    try {
      const res = await fetch(`/api/usernames/check?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (data.available) {
        setState({ status: 'available' });
      } else {
        setState({
          status: 'unavailable',
          reason: data.reason,
          message: data.message ?? USERNAME_ERROR_MESSAGES[data.reason as UsernameError],
          suggestions: data.suggestions,
        });
      }
    } catch (err) {
      setState({ status: 'idle' });
    }
  }, []);

  // Debounced check on value change
  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => {
      checkAvailability(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, checkAvailability, disabled]);

  const statusColor =
    state.status === 'available'
      ? 'text-emerald-400'
      : state.status === 'unavailable'
      ? 'text-red-400'
      : 'text-white/40';

  const statusText =
    state.status === 'checking'
      ? 'Checking...'
      : state.status === 'available'
      ? 'Available!'
      : state.status === 'unavailable'
      ? state.message
      : '';

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-sm whitespace-nowrap">
          rinkstop.com/profile/
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          maxLength={30}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="flex-1 bg-white border border-white/30 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-[#FFB81C] focus:ring-2 focus:ring-[#FFB81C]/20 disabled:opacity-50 caret-[#041E42]"
          title={disabled ? disabledReason : undefined}
        />
      </div>

      {state.status !== 'idle' && !disabled && (
        <p className={`text-xs mt-1 ${statusColor}`}>{statusText}</p>
      )}

      {disabled && disabledReason && (
        <p className="text-xs mt-1 text-white/40">{disabledReason}</p>
      )}

      {state.status === 'unavailable' && state.suggestions && state.suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-white/40">Try:</span>
          {state.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#FFB81C] border border-[#FFB81C]/20"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
