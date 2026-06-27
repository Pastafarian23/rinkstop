'use client';

import { useState } from 'react';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null;

const STATUS_CONFIG: Array<{ value: AttendanceStatus; label: string; color: string; bgColor: string }> = [
  { value: 'present', label: 'Present', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
  { value: 'absent', label: 'Absent', color: '#C8102E', bgColor: 'rgba(200,16,46,0.15)' },
  { value: 'late', label: 'Late', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
  { value: 'excused', label: 'Excused', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
];

const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

interface AttendanceCheckProps {
  playerId: string;
  initialStatus: AttendanceStatus;
  onChange: (playerId: string, status: AttendanceStatus) => void;
  disabled?: boolean;
}

export function AttendanceCheck({ playerId, initialStatus, onChange, disabled }: AttendanceCheckProps) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);

  function handleClick(newStatus: AttendanceStatus) {
    setStatus(newStatus);
    onChange(playerId, newStatus);
  }

  const currentConfig = STATUS_CONFIG.find(s => s.value === status) || STATUS_CONFIG[0];

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {STATUS_ORDER.map((s) => {
        const cfg = STATUS_CONFIG.find(c => c.value === s)!;
        const isActive = status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => handleClick(s)}
            disabled={disabled}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              border: isActive ? `1px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.12)',
              background: isActive ? cfg.bgColor : 'rgba(255,255,255,0.04)',
              color: isActive ? cfg.color : 'rgba(255,255,255,0.6)',
              borderRadius: 4,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
            aria-pressed={isActive}
            title={cfg.label}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}