'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Segment {
  id: string;
  name: string;
  duration_min: number;
  drills: string;
  notes: string;
}

interface Segments {
  warmup: Segment[];
  main: Segment[];
  cooldown: Segment[];
}

interface InitialPlan {
  title: string;
  summary: string;
  focus: string;
  age_min: number;
  age_max: number;
  duration_min: number;
  skill_level: string;
  structure: {
    warmup?: Array<{ name: string; duration_min: number; drills?: string; notes?: string }>;
    main?: Array<{ name: string; duration_min: number; drills?: string; notes?: string }>;
    cooldown?: Array<{ name: string; duration_min: number; drills?: string; notes?: string }>;
  };
  coach_notes: string | null;
  equipment: string[];
  is_template: boolean;
}

const FOCUS_OPTIONS = [
  { value: 'skills', label: 'Skills' },
  { value: 'game_situations', label: 'Game situations' },
  { value: 'off_ice', label: 'Off-ice' },
  { value: 'goalie', label: 'Goalie' },
  { value: 'conditioning', label: 'Conditioning' },
];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all', label: 'All levels' },
];

function newSegment(): Segment {
  return { id: crypto.randomUUID(), name: '', duration_min: 5, drills: '', notes: '' };
}

function fromStored(arr?: Array<{ name: string; duration_min: number; drills?: string; notes?: string }>): Segment[] {
  if (!arr || arr.length === 0) return [];
  return arr.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    duration_min: s.duration_min,
    drills: s.drills || '',
    notes: s.notes || '',
  }));
}

interface PlanEditorProps {
  planId: string;
  initial: InitialPlan;
}

export default function PlanEditor({ planId, initial }: PlanEditorProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [focus, setFocus] = useState(initial.focus);
  const [skillLevel, setSkillLevel] = useState(initial.skill_level);
  const [ageMin, setAgeMin] = useState(initial.age_min);
  const [ageMax, setAgeMax] = useState(initial.age_max);
  const [equipment, setEquipment] = useState(initial.equipment.join(', '));
  const [coachNotes, setCoachNotes] = useState(initial.coach_notes || '');
  const [isTemplate, setIsTemplate] = useState(initial.is_template);

  const [segments, setSegments] = useState<Segments>({
    warmup: fromStored(initial.structure.warmup),
    main: fromStored(initial.structure.main),
    cooldown: fromStored(initial.structure.cooldown),
  });

  const addSegment = (section: keyof Segments) => {
    setSegments((s) => ({ ...s, [section]: [...s[section], newSegment()] }));
  };
  const removeSegment = (section: keyof Segments, id: string) => {
    setSegments((s) => ({ ...s, [section]: s[section].filter((x) => x.id !== id) }));
  };
  const updateSegment = (section: keyof Segments, id: string, patch: Partial<Segment>) => {
    setSegments((s) => ({
      ...s,
      [section]: s[section].map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  };

  const segmentTotal = (arr: Segment[]) => arr.reduce((sum, s) => sum + (s.duration_min || 0), 0);
  const totalDuration =
    segmentTotal(segments.warmup) + segmentTotal(segments.main) + segmentTotal(segments.cooldown);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError('Title is required'); return; }
    if (!summary.trim()) { setError('Summary is required'); return; }
    if (ageMin < 4 || ageMax < ageMin) { setError('Age range is invalid'); return; }
    if (totalDuration < 5) { setError('Plan must have at least 5 minutes of segments'); return; }
    if (segments.main.length === 0) { setError('Plan must have at least one main drill segment'); return; }
    for (const seg of [...segments.warmup, ...segments.main, ...segments.cooldown]) {
      if (!seg.name.trim()) { setError('All segments need a name'); return; }
    }

    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        summary: summary.trim(),
        focus,
        age_min: ageMin,
        age_max: ageMax,
        duration_min: totalDuration,
        skill_level: skillLevel,
        equipment: equipment.split(',').map((e) => e.trim()).filter(Boolean),
        coach_notes: coachNotes.trim() || null,
        is_template: isTemplate,
        structure: {
          warmup: segments.warmup.map(stripMeta),
          main: segments.main.map(stripMeta),
          cooldown: segments.cooldown.map(stripMeta),
          coach_notes: coachNotes.trim() || undefined,
        },
      };

      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Update failed (${res.status})`);
      }

      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this plan? This cannot be undone. Saved bookmarks and run history for this plan will also be removed.')) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      startTransition(() => {
        router.push('/dashboard/plans');
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Basics */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Basics</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Title</span>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Summary</span>
            <textarea
              required
              maxLength={500}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Focus</span>
            <select value={focus} onChange={(e) => setFocus(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Skill level</span>
            <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {SKILL_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Age range (IIHF U-system)</span>
            <div className="flex items-center gap-2">
              <input type="number" min={4} max={99} value={ageMin} onChange={(e) => setAgeMin(parseInt(e.target.value, 10) || 0)} className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <span className="text-slate-500">to</span>
              <input type="number" min={4} max={99} value={ageMax} onChange={(e) => setAgeMax(parseInt(e.target.value, 10) || 0)} className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Equipment (comma-separated)</span>
            <input type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      {/* Segments */}
      <SegmentEditor section="warmup" title="Warmup" emoji="🔥" segments={segments.warmup} onAdd={addSegment} onRemove={removeSegment} onUpdate={updateSegment} />
      <SegmentEditor section="main" title="Main drills" emoji="⛸️" segments={segments.main} onAdd={addSegment} onRemove={removeSegment} onUpdate={updateSegment} />
      <SegmentEditor section="cooldown" title="Cooldown" emoji="🧘" segments={segments.cooldown} onAdd={addSegment} onRemove={removeSegment} onUpdate={updateSegment} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Total plan duration: <strong>{totalDuration} min</strong>
      </div>

      {/* Coach notes */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Coach notes</h2>
        <textarea
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} className="rounded border-slate-300" />
          <span className="text-slate-700">Mark as a reusable template</span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting || isPending || deleting}
          className="rounded-md bg-[#041E42] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#041E42]/90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href={`/dashboard/plans`}
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting || deleting || isPending}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete plan'}
          </button>
        </div>
      </div>
    </form>
  );
}

function stripMeta(s: Segment) {
  return {
    name: s.name.trim(),
    duration_min: s.duration_min,
    ...(s.drills.trim() ? { drills: s.drills.trim() } : {}),
    ...(s.notes.trim() ? { notes: s.notes.trim() } : {}),
  };
}

interface SegmentEditorProps {
  section: keyof Segments;
  title: string;
  emoji: string;
  segments: Segment[];
  onAdd: (section: keyof Segments) => void;
  onRemove: (section: keyof Segments, id: string) => void;
  onUpdate: (section: keyof Segments, id: string, patch: Partial<Segment>) => void;
}

function SegmentEditor({ section, title, emoji, segments, onAdd, onRemove, onUpdate }: SegmentEditorProps) {
  const totalMin = segments.reduce((sum, s) => sum + (s.duration_min || 0), 0);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          <span className="mr-2">{emoji}</span>
          {title}
        </h2>
        <span className="text-sm text-slate-500">{totalMin} min</span>
      </div>
      {segments.length === 0 ? (
        <p className="mb-3 text-sm italic text-slate-500">No segments yet.</p>
      ) : (
        <ol className="mb-3 space-y-3">
          {segments.map((seg, i) => (
            <li key={seg.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">#{i + 1}</span>
                <input
                  type="text"
                  required
                  value={seg.name}
                  onChange={(e) => onUpdate(section, seg.id, { name: e.target.value })}
                  placeholder="Segment name"
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  required
                  min={1}
                  max={240}
                  value={seg.duration_min}
                  onChange={(e) => onUpdate(section, seg.id, { duration_min: parseInt(e.target.value, 10) || 0 })}
                  className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-slate-500">min</span>
                <button
                  type="button"
                  onClick={() => onRemove(section, seg.id)}
                  className="ml-1 text-slate-400 hover:text-red-600"
                  aria-label="Remove segment"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={seg.drills}
                onChange={(e) => onUpdate(section, seg.id, { drills: e.target.value })}
                placeholder="Drill description (optional)"
                className="mb-1.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
              <input
                type="text"
                value={seg.notes}
                onChange={(e) => onUpdate(section, seg.id, { notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => onAdd(section)}
        className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        + Add segment
      </button>
    </section>
  );
}
