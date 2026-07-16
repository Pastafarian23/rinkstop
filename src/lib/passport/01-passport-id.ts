/**
 * src/lib/passport/01-passport-id.ts
 *
 * Passport ID generation in the RS1 format.
 *
 * Format: RS1-{12 base32 chars}
 * Example: RS1-K7X9P2M4N6Q8R
 *
 * Per spec: short, URL-safe, human-readable, not guessable.
 *
 * Implementation notes:
 * - 10 bytes of cryptographically random entropy (80 bits).
 * - Base32 alphabet excludes confusing characters (0, O, 1, I) for readability.
 * - Case-insensitive on input (validation), uppercase on output (canonical).
 * - Uniqueness enforced by DB PRIMARY KEY on passport_id (text).
 *
 * Format evolution:
 * - RS1 prefix allows future format changes (RS2, RS3) while maintaining
 *   backward lookup. Lookup is by passport_id PK; format is invisible to
 *   the database.
 */

const PREFIX = 'RS1';
const ENTROPY_BYTES = 10; // 80 bits → 16 Base32 chars

/**
 * Base32 alphabet excluding confusing characters: 0, O, 1, I.
 * Includes: A-Z (minus I, O), 2-7.
 * Total: 26 letters - 2 (I, O) + 6 digits = 30 characters... we want 32.
 *
 * Final alphabet (Crockford-style):
 *   A B C D E F G H J K L M N P Q R S T V W X Y Z (23)
 *   2 3 4 5 6 7 (6)
 *   Total: 29... let me use a true 32-char alphabet.
 *
 * Using RFC 4648 Base32 with confused chars replaced:
 *   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 2 3 4 5 6 7
 *
 * To exclude I and O (visually similar to 1 and 0):
 *   A B C D E F G H J K L M N P Q R S T U V W X Y Z (24, no I, no O)
 *   2 3 4 5 6 7 (6)
 *   Total: 30... need 32.
 *
 * Solution: use 30-char alphabet with 80-bit entropy. 10 bytes / log2(30) ≈ 16.09 chars.
 * We'll emit exactly 16 chars after encoding.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 30 chars, excludes I/O/0/1
// Wait: '2', '3', '4', '5', '6', '7', '8', '9' — that's 8 digits.
// Plus 24 letters (no I, no O).
// Total: 32 chars. Good.

const ALPHABET_REFINED = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars
const ENCODED_CHARS = 16; // 80 bits / 5 bits per char = exactly 16 chars

// Must match ALPHABET above (30 chars: A-Z minus I/O, plus 2-9 minus 0/1)
const VALID_FORMAT_REGEX = /^RS1-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/i;

/**
 * Base32 encode bytes using our 32-char alphabet.
 * Pads output to exactly ENCODED_CHARS characters.
 */
function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET_REFINED[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    output += ALPHABET_REFINED[(value << (5 - bits)) & 0x1f];
  }

  // Pad if needed (should not happen with 10 bytes → exactly 16 chars).
  while (output.length < ENCODED_CHARS) {
    output += 'A';
  }

  return output;
}

/**
 * Generate a new Passport ID.
 *
 * @returns A string in the format `RS1-{16 base32 chars}`.
 *
 * Cryptographic randomness comes from crypto.getRandomValues which is
 * available in Node.js 19+ and all modern browsers. This is a server-only
 * function — never call from a client component.
 */
export function generatePassportId(): string {
  const bytes = new Uint8Array(ENTROPY_BYTES);
  crypto.getRandomValues(bytes);
  const encoded = base32Encode(bytes);
  return `${PREFIX}-${encoded}`;
}

/**
 * Validate that a candidate string is in valid Passport ID format.
 *
 * This is a format check only. It does NOT check whether the Passport
 * exists in the database. For existence checks, use PassportLookupService.
 *
 * @param candidate - The string to validate.
 * @returns True if the string matches RS1-{16 base32 chars} format.
 */
export function isValidPassportIdFormat(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  return VALID_FORMAT_REGEX.test(candidate);
}

/**
 * Normalize a Passport ID to canonical uppercase form.
 *
 * RS1 IDs are case-insensitive (base32 letters are uppercase canonical).
 * This function returns the uppercase form for storage and comparison.
 *
 * @param id - The Passport ID to normalize.
 * @returns The uppercase form, or null if invalid.
 */
export function normalizePassportId(id: string | null | undefined): string | null {
  if (!id) return null;
  const upper = id.toUpperCase();
  if (!isValidPassportIdFormat(upper)) return null;
  return upper;
}