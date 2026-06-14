/**
 * Username validation and slug generation.
 *
 * Instagram-compatible rules:
 * - 1-30 characters
 * - [a-z0-9._] only (lowercase, normalized on input)
 * - No leading/trailing period
 * - No consecutive periods
 * - No period-underscore adjacency
 * - Not all-numeric
 * - Not reserved
 * - Not actively held
 *
 * Reference: docs/USERNAME_DESIGN.md
 */

export const USERNAME_MIN_LENGTH = 1;
export const USERNAME_MAX_LENGTH = 30;
export const COOLDOWN_DAYS = 14;

// Instagram-style pattern. Pure lowercase + digits + . + _
const USERNAME_PATTERN = /^[a-z0-9._]+$/;

export type UsernameError =
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'all_numeric'
  | 'leading_period'
  | 'trailing_period'
  | 'consecutive_periods'
  | 'period_underscore_adjacent'
  | 'reserved'
  | 'taken';

export type UsernameValidation =
  | { valid: true; normalized: string }
  | { valid: false; error: UsernameError; suggestions?: string[] };

export function isInvalid(v: UsernameValidation): v is { valid: false; error: UsernameError; suggestions?: string[] } {
  return !v.valid;
}

/**
 * Normalize a username to its canonical form:
 * - Trim whitespace
 * - Lowercase
 * Note: this does NOT strip invalid characters — validateUsername() does that
 * with specific error messages.
 */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Validate a username against all Instagram-compatible rules.
 * Does NOT check server-side state (reserved list, taken list) — that's
 * `isUsernameAvailable()` in username-server.ts.
 */
export function validateUsername(input: string): UsernameValidation {
  // Empty / whitespace-only
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'too_short' };
  }

  // Normalize case
  const normalized = trimmed.toLowerCase();

  // Length checks
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: 'too_short' };
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: 'too_long' };
  }

  // Character set
  if (!USERNAME_PATTERN.test(normalized)) {
    return { valid: false, error: 'invalid_chars' };
  }

  // All-numeric check
  if (/^[0-9]+$/.test(normalized)) {
    return { valid: false, error: 'all_numeric' };
  }

  // Period rules
  if (normalized.startsWith('.')) {
    return { valid: false, error: 'leading_period' };
  }
  if (normalized.endsWith('.')) {
    return { valid: false, error: 'trailing_period' };
  }
  if (normalized.includes('..')) {
    return { valid: false, error: 'consecutive_periods' };
  }
  if (normalized.includes('._') || normalized.includes('_.')) {
    return { valid: false, error: 'period_underscore_adjacent' };
  }

  return { valid: true, normalized };
}

/**
 * Generate a slug from a display name.
 * "John Smith" -> "john.smith"
 * "Mary O'Brien" -> "mary.obrien"
 * "Coach 123" -> "coach.123"
 * "  spaces around  " -> "spaces.around"
 *
 * Strategy: lowercase, strip apostrophes, replace non-allowed chars with nothing,
 * collapse whitespace to single period.
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '') // strip apostrophes (curly + straight + backtick)
    .replace(/[^a-z0-9._]+/g, '.') // any non-allowed char run -> single period
    .replace(/^\.+|\.+$/g, '') // strip leading/trailing periods
    .replace(/\.{2,}/g, '.') // collapse consecutive periods
    .slice(0, USERNAME_MAX_LENGTH); // hard cap
}

/**
 * Generate alternative suggestions for a taken username.
 * Returns up to `count` distinct suggestions, all valid against the rules.
 */
export function generateSuggestions(takenSlug: string, count = 5): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>([takenSlug]);

  function pushIfValid(slug: string) {
    if (suggestions.length >= count) return;
    if (seen.has(slug)) return;
    const v = validateUsername(slug);
    if (v.valid && v.normalized !== takenSlug) {
      suggestions.push(v.normalized);
      seen.add(v.normalized);
    }
  }

  // Strategy 1: append underscore
  pushIfValid(takenSlug + '_');

  // Strategy 2: append a number (2, 3, 4 to avoid suggesting "1")
  for (let n = 2; n <= 20 && suggestions.length < count; n++) {
    pushIfValid(takenSlug + n);
  }

  // Strategy 3: prefix with "the."
  if (takenSlug.length + 4 <= USERNAME_MAX_LENGTH) {
    pushIfValid('the.' + takenSlug);
  }

  // Strategy 4: append "hockey" or "hockey2" etc.
  if (takenSlug.length + 6 <= USERNAME_MAX_LENGTH) {
    pushIfValid(takenSlug + '.hockey');
  }
  for (let n = 2; n <= 5 && suggestions.length < count; n++) {
    pushIfValid(takenSlug + '.hockey' + n);
  }

  // Strategy 5: prefix common hockey-related words
  const prefixes = ['real.', 'hockey.', 'coach.', 'player.'];
  for (const prefix of prefixes) {
    if (suggestions.length >= count) break;
    if (prefix.length + takenSlug.length <= USERNAME_MAX_LENGTH) {
      pushIfValid(prefix + takenSlug);
    }
  }

  return suggestions;
}

/**
 * User-facing error messages.
 * Use these in the UI to give specific, helpful feedback.
 */
export const USERNAME_ERROR_MESSAGES: Record<UsernameError, string> = {
  too_short: 'Username is required',
  too_long: `Username can't be more than ${USERNAME_MAX_LENGTH} characters`,
  invalid_chars:
    'Usernames can only contain lowercase letters, numbers, periods, and underscores',
  all_numeric: 'Username must contain at least one letter',
  leading_period: "Username can't start with a period",
  trailing_period: "Username can't end with a period",
  consecutive_periods: "Username can't have consecutive periods",
  period_underscore_adjacent: "Username can't have a period next to an underscore",
  reserved: 'This username is reserved. Please choose another.',
  taken: 'This username is already taken',
};
