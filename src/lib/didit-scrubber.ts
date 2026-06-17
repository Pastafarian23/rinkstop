/**
 * src/lib/didit-scrubber.ts — Strip PII from Didit decision payloads
 *
 * GDPR Article 9 (special category biometric data) and Article 17 (right to
 * erasure) require we do NOT keep:
 *   - portrait_image URL (biometric data)
 *   - signature_image URL
 *   - chip_data
 *   - document_number, personal_number, full_name
 *   - email_address, phone_number, birth_date, address
 *   - authenticity, certificate_summary (contain PII)
 *
 * We KEEP non-PII audit fields only:
 *   - status (Approved/Declined/In Review)
 *   - id_verifications[].document_type (Passport/ID Card, not specific doc)
 *   - id_verifications[].issuing_country (3-letter ISO code)
 *   - liveness_checks[].status, .method, .score (PASSIVE, numeric score)
 *   - face_matches[].status, .score (numeric, not biometric)
 *   - aml_screenings[].status (clear/flagged)
 *   - cost_cents (from Didit billing metadata)
 *   - features[] (which checks were run)
 *
 * The unsanitized original lives in Didit's system per their retention policy.
 * If a user invokes GDPR Art. 17, we null out our scrubbed audit row + the
 * profile.identity_verified_at flag. Badge disappears. User can re-verify.
 *
 * Schema flexibility: storing these as JSONB (not separate columns) means
 * if Didit adds a new field we want to keep, we just update this function.
 * No migration required.
 */

export interface ScrubbedIdVerification {
  document_type?: string;
  issuing_country?: string;
  // `status` is required; if Didit doesn't send it, we drop the whole row.
  status?: string;
}

export interface ScrubbedLivenessCheck {
  status?: string;
  method?: string;
  score?: number;
}

export interface ScrubbedFaceMatch {
  status?: string;
  score?: number;
}

export interface ScrubbedAmlScreening {
  status?: string;
}

export interface ScrubbedDecision {
  status?: string;
  document_type?: string;
  issuing_country?: string;
  liveness_score?: number;
  face_match_score?: number;
  aml_status?: string;
  cost_cents?: number;
  features?: string[];
  scrubbed_at: string;        // ISO timestamp of when we scrubbed
  scrubber_version: string;   // version of this function
}

/**
 * PII fields we explicitly DROP from any object.
 * Add to this list as new PII fields appear in Didit payloads.
 */
const PII_FIELD_DENY_LIST = new Set([
  'document_number',
  'personal_number',
  'full_name',
  'email_address',
  'phone_number',
  'birth_date',
  'address',
  'portrait_image',        // URL — also biometric
  'signature_image',       // URL
  'chip_data',             // full PII dump from chip
  'authenticity',          // contains certificate serial + PII
  'certificate_summary',   // certificate details
  'mrz',                   // machine-readable zone = full ID
  'barcode',               // barcode contents = full ID
  'date_of_birth',
  'date_of_issue',
  'date_of_expiry',
  'place_of_birth',
  'nationality',
]);

/**
 * Walk an arbitrary object and drop any key in the PII deny list.
 * Returns a new object — does NOT mutate the input.
 */
function stripPiiDeep<T = any>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map(stripPiiDeep) as any;
  }
  if (typeof input !== 'object') return input;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (PII_FIELD_DENY_LIST.has(key)) continue;
    result[key] = stripPiiDeep(value);
  }
  return result as T;
}

/**
 * Public entry: take a raw Didit decision and return only the audit-relevant
 * non-PII fields. Always sets scrubbed_at + scrubber_version so we can
 * verify in the future that this row was processed.
 */
export function scrubDecision(raw: any): ScrubbedDecision {
  if (!raw || typeof raw !== 'object') {
    return {
      scrubbed_at: new Date().toISOString(),
      scrubber_version: SCRUBBER_VERSION,
    };
  }

  // Strip PII from the whole object first.
  const cleaned = stripPiiDeep(raw);

  // Extract the audit-relevant fields per the design doc.
  const idVer = Array.isArray(cleaned.id_verifications) ? cleaned.id_verifications[0] : null;
  const liveness = Array.isArray(cleaned.liveness_checks) ? cleaned.liveness_checks[0] : null;
  const faceMatch = Array.isArray(cleaned.face_matches) ? cleaned.face_matches[0] : null;
  const aml = Array.isArray(cleaned.aml_screenings) ? cleaned.aml_screenings[0] : null;

  const scrubbed: ScrubbedDecision = {
    scrubbed_at: new Date().toISOString(),
    scrubber_version: SCRUBBER_VERSION,
  };

  if (typeof cleaned.status === 'string') scrubbed.status = cleaned.status;
  if (idVer?.document_type) scrubbed.document_type = idVer.document_type;
  if (idVer?.issuing_country) scrubbed.issuing_country = idVer.issuing_country;
  if (typeof liveness?.score === 'number') scrubbed.liveness_score = liveness.score;
  if (typeof faceMatch?.score === 'number') scrubbed.face_match_score = faceMatch.score;
  if (aml?.status) scrubbed.aml_status = aml.status;
  if (typeof cleaned.cost_cents === 'number') scrubbed.cost_cents = cleaned.cost_cents;
  if (Array.isArray(cleaned.features)) {
    scrubbed.features = cleaned.features.filter((f: any) => typeof f === 'string');
  }

  return scrubbed;
}

/**
 * Bump this when the scrubber logic changes. Stored on every scrubbed row
 * so we can audit in the future: "was this row scrubbed with the version
 * that had the right deny list?"
 */
export const SCRUBBER_VERSION = '1.0.0';

/**
 * Helper: derive identity_verification_method from a raw Didit decision.
 * Used to populate profiles.identity_verification_method.
 *
 * Didit's id_verifications[].document_type values we map:
 *   - 'passport'  → 'didit_passport'
 *   - 'id_card'   → 'didit_id_card'
 *   - 'selfie'    → 'didit_selfie_only' (re-verification via selfie)
 *
 * Default to 'didit_passport' if ambiguous (most users choose passport).
 */
export function deriveVerificationMethod(raw: any): 'didit_passport' | 'didit_id_card' | 'didit_selfie_only' {
  const idVer = Array.isArray(raw?.id_verifications) ? raw.id_verifications[0] : null;
  const docType = String(idVer?.document_type || '').toLowerCase();
  if (docType === 'passport') return 'didit_passport';
  if (docType === 'id_card' || docType === 'identity_card') return 'didit_id_card';
  if (docType === 'selfie') return 'didit_selfie_only';
  // Heuristic: if there's a portrait_image but no document scan (biometric-only flow)
  const hasDoc = !!idVer && Object.keys(idVer).length > 0;
  if (!hasDoc) return 'didit_selfie_only';
  return 'didit_passport';
}
