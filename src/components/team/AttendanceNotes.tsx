'use client';

import { useState, useRef, useEffect } from 'react';
import { AttendanceStatus } from './AttendanceCheck';

interface AttendanceNotesProps {
  playerId: string;
  eventId: string;
  teamSlug: string;
  initialNote?: string | null;
  onNoteChange?: (playerId: string, note: string | null) => void;
  disabled?: boolean;
}

export function AttendanceNotes({ playerId, eventId, teamSlug, initialNote, onNoteChange, disabled }: AttendanceNotesProps) {
  const [note, setNote] = useState(initialNote || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (note === (initialNote || '')) return;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setIsSaving(true);
    setSaved(false);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/team/${teamSlug}/events/${eventId}/attendance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, attendanceNote: note.trim() || null }),
        });
        if (response.ok) {
          setSaved(true);
          onNoteChange?.(playerId, note.trim() || null);
        }
      } catch (e) {
        console.error('Note save failed:', e);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [note, teamSlug, eventId, playerId, initialNote, onNoteChange]);

  if (disabled) return null;

  return (
    <div style={{ marginTop: 4, maxWidth: 280 }}>
      <input
        type="text"
        placeholder="Add note (late, excused, etc.)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          width: '100%', padding: '0.3rem 0.5rem', fontSize: 11,
          background: '#0a0a0a',
          border: '1px solid #222', borderRadius: 4,
          color: '#fff', outline: 'none',
        }}
      />
      {isSaving && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, display: 'block' }}>Saving…</span>}
      {saved && <span style={{ fontSize: 10, color: '#22c55e', marginTop: 2, display: 'block' }}>Saved ✓</span>}
    </div>
  );
}
