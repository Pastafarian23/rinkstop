import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Source = 'admin' | 'review';
type AuditEvent = {
  id: string;
  source: Source;
  occurred_at: string;
  actor_user_id?: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  params?: Record<string, any>;
  diff?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
};

const MAX_ROWS = 500;

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function fetchAdminEvents(params: URLSearchParams) {
  const from = params.get('from') || null;
  const to = params.get('to') || null;
  const actor = params.get('actor') || null;
  const entity = params.get('entity') || null;
  const action = params.get('action') || null;
  const limit = Math.min(Number(params.get('limit') || '100'), MAX_ROWS);

  let q = supabaseAdmin
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) throw error;

  // Filter actor/entity/action in JS (safe — no string interpolation into
  // PostgREST filters, which can produce injection shape via `.or()`).
  const rows = (data || []).filter((r: any) => {
    if (actor) {
      const q = actor.toLowerCase();
      const id = String(r.actor_user_id ?? '').toLowerCase();
      const email = String(r.actor_email ?? '').toLowerCase();
      if (!id.includes(q) && !email.includes(q)) return false;
    }
    if (entity && r.entity_type !== entity) return false;
    if (action && r.action !== action) return false;
    return true;
  });

  return rows.map((r: any) => ({
    id: `admin-${r.id}`,
    source: 'admin' as Source,
    occurred_at: r.created_at,
    actor_user_id: r.actor_user_id,
    actor_email: r.actor_email,
    actor_role: r.actor_role,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    entity_name: r.entity_name,
    params: r.params || {},
    diff: r.diff || null,
    ip_address: r.ip_address,
    user_agent: r.user_agent,
  }));
}

async function fetchReviewEvents(params: URLSearchParams) {
  const from = params.get('from') || null;
  const to = params.get('to') || null;
  const actor = params.get('actor') || null;
  const entity = params.get('entity') || null;
  const action = params.get('action') || null;
  const limit = Math.min(Number(params.get('limit') || '100'), MAX_ROWS);

  let q = supabaseAdmin
    .from('post_review_edits')
    .select(`
      id,
      post_id,
      field,
      old_value,
      new_value,
      reviewed_by,
      reviewed_at,
      post:posts(id, slug, title, status)
    `)
    .order('reviewed_at', { ascending: false })
    .limit(limit);

  if (from) q = q.gte('reviewed_at', from);
  if (to) q = q.lte('reviewed_at', to);

  const { data, error } = await q;
  if (error) throw error;

  // Same JS-side filter pattern as admin events. Avoids PostgREST `.or()` and
  // a separate `reviewed_by` UUID comparison against an arbitrary actor string.
  const rows = (data || []).filter((r: any) => {
    if (actor) {
      const q = actor.toLowerCase();
      const id = String(r.reviewed_by ?? '').toLowerCase();
      if (!id.includes(q)) return false;
    }
    if (entity && r.post_id !== entity) return false;
    if (action && r.field !== action) return false;
    return true;
  });

  return rows.map((r: any): AuditEvent => ({
    id: `review-${r.id}`,
    source: 'review' as Source,
    occurred_at: r.reviewed_at,
    actor_user_id: r.reviewed_by,
    actor_email: null,
    actor_role: 'admin',
    action: r.field,
    entity_type: 'post',
    entity_id: r.post_id,
    entity_name: r.post?.title || r.post?.slug || null,
    params: {},
    diff: { old_value: r.old_value, new_value: r.new_value },
    ip_address: null,
    user_agent: null,
  }));
}

export async function GET(request: NextRequest) {
  const auth = await getAdminFromRequest(request, 'admin_audit-log');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');

  try {
    const [adminEvents, reviewEvents] = await Promise.all([
      source === 'admin' ? [] : fetchAdminEvents(searchParams),
      source === 'review' ? [] : fetchReviewEvents(searchParams),
    ]);

    const events: AuditEvent[] = [...adminEvents, ...reviewEvents]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, MAX_ROWS);

    if (searchParams.get('format') === 'csv') {
      const header = [
        'id',
        'source',
        'occurred_at',
        'actor_user_id',
        'actor_email',
        'actor_role',
        'action',
        'entity_type',
        'entity_id',
        'entity_name',
        'params',
        'diff',
        'ip_address',
        'user_agent',
      ].map(csvEscape).join(',');
      const body = events.map((e) =>
        [
          e.id,
          e.source,
          e.occurred_at,
          e.actor_user_id,
          e.actor_email,
          e.actor_role,
          e.action,
          e.entity_type,
          e.entity_id,
          e.entity_name,
          JSON.stringify(e.params || {}),
          JSON.stringify(e.diff || {}),
          e.ip_address,
          e.user_agent,
        ].map(csvEscape).join(',')
      ).join('\n');
      return new Response(`${header}\n${body}\n`, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="admin-audit-log.csv"',
        },
      });
    }

    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
