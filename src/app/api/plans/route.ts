import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const FOCUS_VALUES = ['skills', 'game_situations', 'off_ice', 'goalie', 'conditioning'] as const;
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'all'] as const;

type FocusValue = (typeof FOCUS_VALUES)[number];
type SkillLevel = (typeof SKILL_LEVELS)[number];

interface PlanSegment {
  name: string;
  duration_min: number;
  drills?: string;
  notes?: string;
}

interface PlanStructure {
  warmup?: PlanSegment[];
  main?: PlanSegment[];
  cooldown?: PlanSegment[];
  coach_notes?: string;
}

interface CreatePlanRequest {
  title: string;
  summary: string;
  focus: FocusValue;
  age_min: number;
  age_max: number;
  duration_min: number;
  skill_level: SkillLevel;
  structure: PlanStructure;
  coach_notes?: string | null;
  equipment?: string[];
  is_template?: boolean;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'plan';
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function validateStructure(s: unknown): ValidationResult<PlanStructure> {
  if (!s || typeof s !== 'object') return { ok: false, error: 'structure required' };
  const obj = s as Record<string, unknown>;
  const out: PlanStructure = {};
  for (const key of ['warmup', 'main', 'cooldown'] as const) {
    const segs = obj[key];
    if (segs === undefined || segs === null) continue;
    if (!Array.isArray(segs)) return { ok: false, error: `structure.${key} must be array` };
    for (const seg of segs) {
      if (!seg || typeof seg !== 'object') return { ok: false, error: `structure.${key}[] must be object` };
      const s2 = seg as Record<string, unknown>;
      if (typeof s2.name !== 'string' || !s2.name.trim()) return { ok: false, error: `segment name required` };
      if (typeof s2.duration_min !== 'number' || s2.duration_min < 1 || s2.duration_min > 240) {
        return { ok: false, error: `segment duration_min must be 1-240` };
      }
      if (s2.drills !== undefined && s2.drills !== null && typeof s2.drills !== 'string') {
        return { ok: false, error: `segment drills must be string` };
      }
      if (s2.notes !== undefined && s2.notes !== null && typeof s2.notes !== 'string') {
        return { ok: false, error: `segment notes must be string` };
      }
    }
    out[key] = segs as PlanSegment[];
  }
  if (typeof obj.coach_notes === 'string') {
    out.coach_notes = obj.coach_notes;
  }
  return { ok: true, value: out };
}

function validate(body: unknown): ValidationResult<CreatePlanRequest> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Request body required' };
  const b = body as Record<string, unknown>;

  if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 200) {
    return { ok: false, error: 'title required (max 200 chars)' };
  }
  if (typeof b.summary !== 'string' || !b.summary.trim() || b.summary.length > 500) {
    return { ok: false, error: 'summary required (max 500 chars)' };
  }
  if (typeof b.focus !== 'string' || !FOCUS_VALUES.includes(b.focus as FocusValue)) {
    return { ok: false, error: `focus must be one of: ${FOCUS_VALUES.join(', ')}` };
  }
  if (typeof b.age_min !== 'number' || b.age_min < 4 || b.age_min > 99) {
    return { ok: false, error: 'age_min must be 4-99' };
  }
  if (typeof b.age_max !== 'number' || b.age_max < b.age_min || b.age_max > 99) {
    return { ok: false, error: 'age_max must be >= age_min, <= 99' };
  }
  if (typeof b.duration_min !== 'number' || b.duration_min < 5 || b.duration_min > 240) {
    return { ok: false, error: 'duration_min must be 5-240' };
  }
  if (typeof b.skill_level !== 'string' || !SKILL_LEVELS.includes(b.skill_level as SkillLevel)) {
    return { ok: false, error: `skill_level must be one of: ${SKILL_LEVELS.join(', ')}` };
  }
  if (b.coach_notes !== undefined && b.coach_notes !== null) {
    if (typeof b.coach_notes !== 'string' || b.coach_notes.length > 2000) {
      return { ok: false, error: 'coach_notes must be string, max 2000 chars' };
    }
  }
  if (b.equipment !== undefined) {
    if (!Array.isArray(b.equipment)) return { ok: false, error: 'equipment must be array' };
    if (b.equipment.length > 20) return { ok: false, error: 'equipment max 20 items' };
    for (const eq of b.equipment) {
      if (typeof eq !== 'string' || eq.length > 200) {
        return { ok: false, error: 'each equipment item must be string, max 200 chars' };
      }
    }
  }
  const structRes = validateStructure(b.structure);
  if (structRes.ok === false) {
    return { ok: false, error: structRes.error };
  }

  return {
    ok: true,
    value: {
      title: b.title.trim(),
      summary: b.summary.trim(),
      focus: b.focus as FocusValue,
      age_min: b.age_min,
      age_max: b.age_max,
      duration_min: b.duration_min,
      skill_level: b.skill_level as SkillLevel,
      structure: structRes.value,
      coach_notes: (b.coach_notes as string | undefined) ?? null,
      equipment: (b.equipment as string[] | undefined) ?? [],
      is_template: b.is_template === true,
    },
  };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const v = validate(body);
  if (v.ok === false) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }
  const p = v.value;

  // Generate a unique slug (add suffix on collision)
  let slug = slugify(p.title);
  let suffix = 0;
  // Loop until we find a free slug (cap at 50 attempts)
  for (let i = 0; i < 50; i++) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data } = await supabaseAdmin
      .from('practice_plans')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) {
      slug = candidate;
      break;
    }
    suffix += 1;
  }

  const { data, error } = await supabaseAdmin
    .from('practice_plans')
    .insert({
      slug,
      title: p.title,
      summary: p.summary,
      focus: p.focus,
      age_min: p.age_min,
      age_max: p.age_max,
      duration_min: p.duration_min,
      skill_level: p.skill_level,
      structure: p.structure,
      coach_notes: p.coach_notes,
      equipment: p.equipment,
      is_template: p.is_template,
      is_published: true,
      created_by_user_id: userId,
    })
    .select('id, slug')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id, slug: data?.slug });
}
