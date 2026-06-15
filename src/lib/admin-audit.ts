// Audit logging helper for admin actions.
//
// Why this exists:
//  - We want a unified "who changed what when" timeline across all admin writes.
//  - post_review_edits already covers field-level article review diffs; this
//    helper covers the coarse-grained writes (bulk ops, listing approvals,
//    role changes, article hard deletes) that were previously invisible.
//
// Best-effort writes: if the audit insert fails, we log to the console and
// return normally. Audit must never block the user's primary action. The
// boolean return lets the route decide whether to surface the failure.

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface AdminContext {
  userId: string;
  email: string;
  role: 'admin' | 'super_admin';
  isSuperAdmin: boolean;
}

export interface AuditEventInput {
  admin: AdminContext;
  request?: NextRequest;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  params?: Record<string, any>;
  diff?: Record<string, any> | null;
}

const MAX_STRING_LEN = 500;
const MAX_JSON_LEN = 8000;

function trim(value: unknown, max = MAX_STRING_LEN): string | null {
  if (value === null || value === undefined) return null;
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function trimJson(
  value: Record<string, any> | null | undefined,
  max = MAX_JSON_LEN
): Record<string, any> | null {
  if (!value) return null;
  try {
    const s = JSON.stringify(value);
    if (s.length <= max) return value;
    return { _truncated: true, preview: s.slice(0, max) };
  } catch {
    return { _unserializable: true };
  }
}

function clientIp(req?: NextRequest): string | null {
  if (!req) return null;
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return null;
}

export async function logAdminEvent(input: AuditEventInput): Promise<boolean> {
  const row = {
    actor_user_id: input.admin.userId,
    actor_email: input.admin.email || null,
    actor_role: input.admin.isSuperAdmin ? 'super_admin' : 'admin',
    action: trim(input.action) || 'unknown',
    entity_type: trim(input.entityType) || 'unknown',
    entity_id: trim(input.entityId) || null,
    entity_name: trim(input.entityName) || null,
    params: trimJson(input.params || {}) || {},
    diff: trimJson(input.diff ?? null),
    ip_address: clientIp(input.request),
    user_agent: trim(input.request?.headers.get('user-agent')) || null,
  };

  try {
    const { error } = await supabaseAdmin.from('admin_audit_log').insert(row);
    if (error) {
      console.error('[admin_audit_log] insert failed', error, row);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[admin_audit_log] exception', e, row);
    return false;
  }
}
