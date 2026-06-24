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
  return {
    id: crypto.randomUUID(),
    name: '',
    duration_min: 5,
    drills: '',
    notes: '',
  };
}

export default function PlanBuilder() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [focus, setFocus] = useState('skills');
  const [skillLevel, setSkillLevel] = useState('all');
  const [ageMin, setAgeMin] = useState(8);
  const [ageMax, setAgeMax] = useState(12);
  const [durationMin, setDurationMin] = useState(60);
  const [equipment, setEquipment] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);

  const [segments, setSegments] = useState<Segments>({
    warmup: [newSegment()],
    main: [newSegment()],
    cooldown: [],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
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

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Create failed (${res.status})`);
      }

      const data = await res.json();
      startTransition(() => {
        router.push(`/dashboard/plans/${data.slug}`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-[#C8102E]/40 bg-[#C8102E]/10 p-3 text-sm text-[#C8102E]" role="alert">
          {error}
        </div>
      )}

      {/* Basics */}
      <section className="rounded-lg border border-white/10 bg-[#111823] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Basics</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block font-medium text-white/80">Title</span>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Skating Fundamentals — U10"
              className="w-full rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="md:col-span-2 text-sm">
            <span className="mb-1 block font-medium text-white/80">Summary</span>
            <textarea
              required
              maxLength={500}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="One-line description of the focus."
              className="w-full rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-white/80">Focus</span>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="w-full rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white"
            >
              {FOCUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-white/80">Skill level</span>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white"
            >
              {SKILL_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-white/80">Age range (IIHF U-system)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={4}
                max={99}
                value={ageMin}
                onChange={(e) => setAgeMin(parseInt(e.target.value, 10) || 0)}
                className="w-20 rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white"
              />
              <span className="text-white/50">to</span>
              <input
                type="number"
                min={4}
                max={99}
                value={ageMax}
                onChange={(e) => setAgeMax(parseInt(e.target.value, 10) || 0)}
                className="w-20 rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white"
              />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-white/80">Equipment (comma-separated)</span>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. pucks, cones, net-front pad"
              className="w-full rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
          </label>
        </div>
      </section>

      {/* Segments */}
      <SegmentEditor
        section="warmup"
        title="Warmup"
        emoji="🔥"
        segments={segments.warmup}
        onAdd={addSegment}
        onRemove={removeSegment}
        onUpdate={updateSegment}
      />
      <SegmentEditor
        section="main"
        title="Main drills"
        emoji="⛸️"
        segments={segments.main}
        onAdd={addSegment}
        onRemove={removeSegment}
        onUpdate={updateSegment}
      />
      <SegmentEditor
        section="cooldown"
        title="Cooldown"
        emoji="🧘"
        segments={segments.cooldown}
        onAdd={addSegment}
        onRemove={removeSegment}
        onUpdate={updateSegment}
      />

      <div className="rounded-lg border border-white/10 bg-[#111823] p-3 text-sm text-white/80">
        Total plan duration: <strong className="text-white">{totalDuration} min</strong>
        {totalDuration !== durationMin && (
          <span className="ml-2 text-[#FFB81C]">
            (overrides the basics field above; saved with this value)
          </span>
        )}
      </div>

      {/* Coach notes */}
      <section className="rounded-lg border border-white/10 bg-[#111823] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Coach notes</h2>
        <textarea
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Any final tips, common mistakes to watch for, or reminders for the coach."
          className="w-full rounded-md border border-white/15 bg-[#0D1117] px-3 py-2 text-sm text-white placeholder:text-white/30"
        />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isTemplate}
            onChange={(e) => setIsTemplate(e.target.checked)}
            className="rounded border-white/15 bg-[#0D1117]"
          />
          <span className="text-white/80">
            Mark as a reusable template (surfaces it in the starter library for other coaches)
          </span>
        </label>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || isPending}
          className="rounded-md bg-[#FFB81C] px-5 py-2.5 text-sm font-medium text-[#0D1117] hover:bg-[#FFB81C]/90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save plan'}
        </button>
        <Link
          href="/dashboard/plans"
          className="rounded-md border border-white/15 bg-[#111823] px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5"
        >
          Cancel
        </Link>
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
    <section className="rounded-lg border border-white/10 bg-[#111823] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          <span className="mr-2">{emoji}</span>
          {title}
        </h2>
        <span className="text-sm text-white/50">{totalMin} min</span>
      </div>
      {segments.length === 0 ? (
        <p className="mb-3 text-sm italic text-white/50">No segments yet.</p>
      ) : (
        <ol className="mb-3 space-y-3">
          {segments.map((seg, i) => (
            <li key={seg.id} className="rounded-md border border-white/10 bg-[#0D1117] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-white/50">#{i + 1}</span>
                <input
                  type="text"
                  required
                  value={seg.name}
                  onChange={(e) => onUpdate(section, seg.id, { name: e.target.value })}
                  placeholder="Segment name (e.g. Forward strides)"
                  className="flex-1 rounded-md border border-white/15 bg-[#0D1117] px-2 py-1.5 text-sm text-white placeholder:text-white/30"
                />
                <input
                  type="number"
                  required
                  min={1}
                  max={240}
                  value={seg.duration_min}
                  onChange={(e) => onUpdate(section, seg.id, { duration_min: parseInt(e.target.value, 10) || 0 })}
                  className="w-16 rounded-md border border-white/15 bg-[#0D1117] px-2 py-1.5 text-sm text-white"
                />
                <span className="text-xs text-white/50">min</span>
                <button
                  type="button"
                  onClick={() => onRemove(section, seg.id)}
                  className="ml-1 text-white/40 hover:text-[#C8102E]"
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
                className="mb-1.5 w-full rounded-md border border-white/15 bg-[#0D1117] px-2 py-1.5 text-sm text-white placeholder:text-white/30"
              />
              <input
                type="text"
                value={seg.notes}
                onChange={(e) => onUpdate(section, seg.id, { notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full rounded-md border border-white/15 bg-[#0D1117] px-2 py-1.5 text-sm text-white placeholder:text-white/30"
              />
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => onAdd(section)}
        className="rounded-md border border-dashed border-white/15 bg-[#111823] px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
      >
        + Add segment
      </button>
    </section>
  );
}
