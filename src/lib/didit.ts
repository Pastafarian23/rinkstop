/**
 * src/lib/didit.ts — Didit.me SDK client for RinkStop
 *
 * Phase 1: Person ID verification (user kind sessions).
 * Phase 2 (later): Business KYB (business kind sessions).
 *
 * Env vars (set on Vercel, never commit values):
 *   - DIDIT_API_KEY           (required, plain)
 *   - DIDIT_WORKFLOW_ID       (required, plain) — Free KYC workflow UUID
 *   - DIDIT_WEBHOOK_SECRET    (required, sensitive) — from /v3/webhook/destinations
 *
 * PII handling: didit-scrubber.ts strips PII fields from `decision` before
 * we ever write it to the DB. Don't bypass the scrubber.
 *
 * Replay protection: webhook handler verifies X-Signature-V2 over canonical
 * JSON with X-Timestamp < 300s old. See didit-webhook-verify.ts.
 */

const BASE_URL = 'https://verification.didit.me';
const API_KEY = process.env.DIDIT_API_KEY;
const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;

// ---------- types ----------

export type SessionKind = 'user' | 'business';
export type SessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'approved'
  | 'declined'
  | 'in_review'
  | 'abandoned'
  | 'resubmitted';

export interface DiditSession {
  id: string;                  // Didit's session UUID
  status: SessionStatus;
  url: string;                 // hosted URL for the user to open
  workflow_id: string;
  vendor_data?: string;        // we pass clerkUserId
  callback_url?: string;
  created_at?: string;
  metadata?: Record<string, any>;
}

export interface DiditDecision {
  session_id: string;
  status: SessionStatus;
  features?: string[];
  id_verifications?: any[];
  liveness_checks?: any[];
  face_matches?: any[];
  aml_screenings?: any[];
  cost_cents?: number;
  // many more fields; scrubber keeps only what's audit-relevant
  [k: string]: any;
}

export interface CreateSessionInput {
  vendorData: string;          // clerkUserId (we use this to look up the user on webhook)
  callbackUrl?: string;        // where to redirect after Didit completes
  metadata?: Record<string, any>;
  // For Phase 2 business KYB:
  legalName?: string;
  entityType?: string;
  jurisdiction?: string;
  registrationNumber?: string;
}

// ---------- helpers ----------

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[didit] Missing required env var ${name}. ` +
      `Set it in Vercel (project settings → environment variables).`
    );
  }
  return value;
}

async function diditFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const apiKey = requireEnv('DIDIT_API_KEY', API_KEY);
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    // Per Didit's official auth docs
    // (https://docs.didit.me/getting-started/api-authentication):
    //   "The verification API does not use OAuth Bearer tokens. It uses
    //    a long-lived API key on the x-api-key header."
    // Was Authorization: Bearer ${apiKey} from initial integration
    // (2026-06-17 commit b7f29f9). Was wrong from day one but never
    // caught because the dev shortcut (direct DB UPDATE on profiles)
    // was the only verification path that ever worked. Arnel caught it
    // on 2026-06-24 when he ran the real flow after the Q1 revoke.
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'RinkStop/1.0 (+https://rinkstop.com)',
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    // Surface Didit's error body for debugging; do NOT echo the API key back.
    throw new Error(
      `[didit] ${init.method || 'GET'} ${path} → HTTP ${res.status}: ${text.slice(0, 500)}`
    );
  }
  if (!text) {
    // Some endpoints (publish, etc.) return empty body on success
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(
      `[didit] ${path} returned non-JSON body: ${text.slice(0, 200)}`
    );
  }
}

// ---------- session creation ----------

/**
 * Create a Didit verification session. Returns the session_id and the hosted URL
 * the user should be redirected to (or embedded in an iframe).
 *
 * @param kind 'user' for Phase 1 person ID; 'business' for Phase 2 KYB
 * @param input vendorData (clerkUserId), optional callback, optional business fields
 */
export async function createSession(
  kind: SessionKind,
  input: CreateSessionInput
): Promise<DiditSession> {
  const workflowId = requireEnv('DIDIT_WORKFLOW_ID', WORKFLOW_ID);

  const body: Record<string, any> = {
    workflow_id: workflowId,
    vendor_data: input.vendorData,
    metadata: {
      kind,
      ...(input.metadata || {}),
    },
  };
  if (input.callbackUrl) {
    body.callback = input.callbackUrl;
    body.callback_method = 'both';  // URL + webhook
  }
  if (kind === 'business') {
    if (input.legalName) body.legal_name = input.legalName;
    if (input.entityType) body.entity_type = input.entityType;
    if (input.jurisdiction) body.jurisdiction = input.jurisdiction;
    if (input.registrationNumber) body.registration_number = input.registrationNumber;
  }

  const session = await diditFetch<DiditSession>('/v3/session/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return session;
}

// ---------- session fetch + decision ----------

/**
 * Fetch session status from Didit. Use this to re-poll a session that's
 * in_progress after the webhook fires, or to confirm a session that
 * returned a stale state.
 */
export async function getSession(sessionId: string): Promise<DiditSession> {
  return diditFetch<DiditSession>(`/v3/session/${sessionId}/`);
}

/**
 * Fetch the decision (final result) for a session. Returns the full V3
 * payload, which must be PII-scrubbed via scrubDecision() before storage.
 */
export async function getDecision(sessionId: string): Promise<DiditDecision> {
  return diditFetch<DiditDecision>(`/v3/session/${sessionId}/decision/`);
}

// ---------- health / diagnostics ----------

/**
 * Ping Didit. Returns the workflow list. Useful for "is the integration
 * working" health checks. Also serves as a key validation.
 */
export async function listWorkflows(): Promise<{ workflows: any[] }> {
  return diditFetch<{ workflows: any[] }>('/v3/workflows/');
}

/**
 * Get the current Didit account balance. Returns USD balance string.
 * Free tier (500/mo) does not require a balance.
 */
export async function getBalance(): Promise<{ balance: string; auto_refill_enabled: boolean }> {
  return diditFetch<{ balance: string; auto_refill_enabled: boolean }>('/v3/billing/balance/');
}

// ---------- iframe URL builder (Option B: hosted iframe) ----------

/**
 * Phase 1 ships with Option B (hosted iframe embed). White-label is deferred
 * because Didit's console requires $250 minimum credit balance to enable a
 * custom domain. iframe is $0 forever, no DNS change, no vendor lock-in.
 *
 * The session's `url` is the canonical hosted page; we wrap it in an iframe
 * inside /dashboard/identity to keep the user in the RinkStop chrome.
 */
export function buildIframeUrl(hostedUrl: string): string {
  // Didit returns a URL on their domain. We embed it as-is in the iframe.
  // No query params needed — the vendor_data we passed in is the lookup key.
  return hostedUrl;
}
