import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/free-agent
 *
 * Body params (multipart form for ease from <form>):
 *   - status: 'off' | 'looking' | 'sub_needed_today'  (REQUIRED)
 *   - position: free-text (optional)
 *   - skill_level: 'beginner'|'intermediate'|'advanced'|'expert' (optional)
 *   - radius_km: 1..500 integer (optional)
 *   - notes: up to 500 chars (optional)
 *   - show_location: 'true'|'false' (optional)
 *
 * Updates the calling user's row ONLY — never another user's.
 * Validates every field server-side so a malicious client can't smuggle
 * SQL or out-of-range values.
 *
 * Response: 303 redirect to /dashboard#free-agent (where the card lives).
 */

const VALID_STATUSES = new Set(['off', 'looking', 'sub_needed_today']);
const VALID_SKILLS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

function clip(s: string | null | undefined, max: number): string | null {
  if (s == null) return null;
  return s.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    const userId = await resolveCanonicalUserId(session.userId, session.userId);

    const form = await req.formData();
    const status = String(form.get('status') || '');
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }

    const skillRaw = form.get('skill_level');
    const skill = skillRaw ? String(skillRaw) : null;
    if (skill !== null && !VALID_SKILLS.has(skill)) {
      return NextResponse.json({ error: 'invalid_skill_level' }, { status: 400 });
    }

    const radiusRaw = form.get('radius_km');
    let radius: number | null = null;
    if (radiusRaw !== null && radiusRaw !== '') {
      const parsed = parseInt(String(radiusRaw), 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 500) {
        return NextResponse.json({ error: 'invalid_radius' }, { status: 400 });
      }
      radius = parsed;
    }

    const notes = clip(form.get('notes') ? String(form.get('notes')) : null, 500);
    const position = clip(form.get('position') ? String(form.get('position')) : null, 80);
    const showLocationRaw = form.get('show_location');
    const showLocation = showLocationRaw === 'true';

    // Build the update payload — defensive: only the fields we want, all explicit.
    const update: Record<string, unknown> = {
      free_agent_status: status,
    };
    if (position !== null) update.free_agent_position = position;
    if (skill !== null) update.free_agent_skill_level = skill;
    else update.free_agent_skill_level = null;
    if (radius !== null) update.free_agent_radius_km = radius;
    else update.free_agent_radius_km = null;
    if (notes !== null) update.free_agent_notes = notes;
    else update.free_agent_notes = null;
    update.free_agent_show_location = showLocation;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('user_id', userId);

    if (error) {
      console.error('[free-agent] update failed:', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.redirect(new URL('/dashboard#free-agent', req.url), { status: 303 });
  } catch (e) {
    console.error('[free-agent] unhandled error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/**
 * Disable any GET — defence against a public reading endpoint leaking data.
 * Browsers can hit this URL; should always be 405.
 */
export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
}
