// src/lib/auth-audit.ts
//
// OWASP A09 audit 2026-08-26: structured logging for auth failures and
// authorization denials. Currently most routes return 401/403 silently,
// which makes it impossible to detect credential stuffing, account
// takeover attempts, or abuse patterns.
//
// This module writes to:
//   - console.error (for Vercel log drain)
//   - auth_audit_log table (for SQL-based review)
//
// Failure to log is non-fatal — the auth path must never be broken by a
// logging outage.

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export type AuthFailureReason =
  | 'no_session'
  | 'no_user'
  | 'wrong_role'
  | 'wrong_tier'
  | 'not_owner'
  | 'not_claimant'
  | 'not_admin'
  | 'wrong_secret'
  | 'federation_admin_required'
  | 'cross_user_forbidden'
  | 'other';

interface AuthAuditParams {
  request: NextRequest;
  userId?: string | null;
  reason: AuthFailureReason;
  attemptedAction: string;
  resourceId?: string;
  requiredRole?: string;
  callerTier?: string;
  statusCode: number;
  detail?: string;
}

export async function logAuthFailure(params: AuthAuditParams): Promise<void> {
  const callerIp =
    params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    params.request.headers.get('x-real-ip') ??
    'unknown';
  const ua = params.request.headers.get('user-agent') ?? 'unknown';
  const path = new URL(params.request.url).pathname;

  // Always log to stderr so Vercel captures it for log drains.
  console.error('[auth-audit]', JSON.stringify({
    type: 'auth_failure',
    ts: new Date().toISOString(),
    path,
    callerIp,
    userAgent: ua,
    userId: params.userId ?? null,
    reason: params.reason,
    attemptedAction: params.attemptedAction,
    resourceId: params.resourceId ?? null,
    requiredRole: params.requiredRole ?? null,
    callerTier: params.callerTier ?? null,
    statusCode: params.statusCode,
    detail: params.detail ?? null,
  }));

  // Persist to DB. Fire-and-forget — must not slow the request.
  try {
    await supabaseAdmin.from('auth_audit_log').insert({
      caller_ip: callerIp,
      user_agent: ua,
      path,
      user_id: params.userId ?? null,
      reason: params.reason,
      attempted_action: params.attemptedAction,
      resource_id: params.resourceId ?? null,
      required_role: params.requiredRole ?? null,
      caller_tier: params.callerTier ?? null,
      status_code: params.statusCode,
      detail: params.detail ?? null,
    });
  } catch (e) {
    // Log the failure but don't propagate — logging must never break auth.
    console.error('[auth-audit] DB insert failed', e);
  }
}