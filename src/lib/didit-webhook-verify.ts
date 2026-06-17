/**
 * src/lib/didit-webhook-verify.ts — Verify Didit webhook signatures
 *
 * Didit's webhook signature scheme (per their V3 docs):
 *   - X-Signature-V2: HMAC-SHA256 hex of canonical JSON body, using the
 *                     secret_shared_key returned when the webhook
 *                     destination was created.
 *   - X-Timestamp:    Unix epoch seconds, sent in the header. Reject if
 *                     abs(now - ts) > 300s (replay protection).
 *   - X-Event-Id:     Unique event id. Didit reuses this on retries, so
 *                     dedupe via the `webhook_events` table.
 *
 * Canonical JSON: parse → recursively sort keys → re-serialize with
 * ensure_ascii=False + no spaces (compact). This is critical because
 * Next.js middleware may re-encode the body, breaking raw-byte HMACs.
 *
 * Reference: Didit webhook spec — X-Signature-V2 over canonical JSON.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const REPLAY_WINDOW_SECONDS = 300;   // 5 min, per design doc

export interface DiditWebhookHeaders {
  signature: string;       // X-Signature-V2
  timestamp: string;       // X-Timestamp
  eventId: string;         // X-Event-Id
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  eventId: string;
  timestamp: number;
}

function parseHeaders(headers: Headers): DiditWebhookHeaders | { error: string } {
  const signature = headers.get('x-signature-v2') || headers.get('X-Signature-V2');
  const timestamp = headers.get('x-timestamp') || headers.get('X-Timestamp');
  const eventId = headers.get('x-event-id') || headers.get('X-Event-Id');
  if (!signature) return { error: 'Missing X-Signature-V2 header' };
  if (!timestamp) return { error: 'Missing X-Timestamp header' };
  if (!eventId) return { error: 'Missing X-Event-Id header' };
  return { signature, timestamp, eventId };
}

function sortKeysDeep(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value !== 'object') return value;
  const sorted: Record<string, any> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep((value as Record<string, any>)[key]);
  }
  return sorted;
}

/**
 * Compute the HMAC-SHA256 of a parsed JSON object using canonical JSON form.
 * Compact, no whitespace, Unicode-preserved, sorted keys.
 */
export function signCanonical(body: any, secret: string): string {
  const sorted = sortKeysDeep(body);
  const json = JSON.stringify(sorted);   // default = no spaces, ensures_ascii=False preserved by default in modern Node
  return createHmac('sha256', secret).update(json, 'utf8').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  // Hex strings are equal length
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export interface VerifyInput {
  rawBody: string;        // raw request body as text
  headers: Headers;       // the request Headers
  secret: string;         // DIDIT_WEBHOOK_SECRET
  now?: number;           // for tests; defaults to Date.now() / 1000
}

/**
 * Verify a Didit webhook request. Returns `{ valid: true, eventId, timestamp }`
 * on success, or `{ valid: false, reason }` on failure.
 *
 * Pipeline:
 *   1. Extract X-Signature-V2, X-Timestamp, X-Event-Id from headers
 *   2. Check X-Timestamp against REPLAY_WINDOW_SECONDS
 *   3. Parse body as JSON
 *   4. Recompute HMAC over canonical-JSON form of body
 *   5. timingSafeEqual against X-Signature-V2
 */
export function verifyDiditWebhook(input: VerifyInput): VerifyResult | { valid: false; reason: string } {
  const { rawBody, headers, secret, now = Math.floor(Date.now() / 1000) } = input;

  // 1. Parse headers
  const parsed = parseHeaders(headers);
  if ('error' in parsed) {
    return { valid: false, reason: parsed.error, eventId: '', timestamp: 0 };
  }

  // 2. Replay protection
  const tsNum = Number(parsed.timestamp);
  if (!Number.isFinite(tsNum)) {
    return { valid: false, reason: 'X-Timestamp is not a number', eventId: parsed.eventId, timestamp: 0 };
  }
  if (Math.abs(now - tsNum) > REPLAY_WINDOW_SECONDS) {
    return {
      valid: false,
      reason: `X-Timestamp out of replay window: now=${now} ts=${tsNum} delta=${now - tsNum}s (max ${REPLAY_WINDOW_SECONDS}s)`,
      eventId: parsed.eventId,
      timestamp: tsNum,
    };
  }

  // 3. Parse body
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return { valid: false, reason: 'Body is not valid JSON', eventId: parsed.eventId, timestamp: tsNum };
  }

  // 4. Recompute signature over canonical JSON
  const expected = signCanonical(body, secret);

  // 5. timingSafeEqual
  if (!safeEqual(expected.toLowerCase(), parsed.signature.toLowerCase())) {
    return {
      valid: false,
      reason: 'X-Signature-V2 mismatch (computed over canonical JSON)',
      eventId: parsed.eventId,
      timestamp: tsNum,
    };
  }

  return { valid: true, eventId: parsed.eventId, timestamp: tsNum };
}
