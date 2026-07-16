/**
 * src/lib/passport/06-id-generator.ts
 *
 * Wraps generatePassportId with collision retry logic.
 *
 * Uniqueness is enforced by the database PRIMARY KEY on passports.passport_id.
 * With 80-bit entropy, collisions are statistically impossible (1 in 2^40
 * for 1 billion IDs), but the retry handles them defensively.
 *
 * 3 attempts before surfacing a PassportCollisionError.
 */

import { generatePassportId, isValidPassportIdFormat } from './01-passport-id';
import { PassportCollisionError, InvalidPassportIdError } from './types';
import type { PassportIdGenerator as IPassportIdGenerator } from './interfaces';

const MAX_ATTEMPTS = 3;

export class PassportIdGenerator implements IPassportIdGenerator {
  /**
   * Generate a unique Passport ID, retrying on collision.
   *
   * @param existingExists - async predicate that returns true if a candidate
   *   ID already exists in the database. The caller wires this to the
   *   repository so the generator doesn't directly couple to DB.
   * @returns A Passport ID that is guaranteed not to exist in the DB.
   * @throws PassportCollisionError if MAX_ATTEMPTS collisions occur.
   */
  async generateUnique(
    existingExists: (id: string) => Promise<boolean>
  ): Promise<string> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const candidate = generatePassportId();
      if (!isValidPassportIdFormat(candidate)) {
        // Should never happen with our own generator.
        throw new InvalidPassportIdError(candidate);
      }
      const exists = await existingExists(candidate);
      if (!exists) return candidate;
    }
    throw new PassportCollisionError(MAX_ATTEMPTS);
  }

  /**
   * Generate a candidate ID without checking the database.
   * Use when the database will reject duplicates itself (e.g. relying on
   * the PRIMARY KEY constraint).
   */
  generate(): string {
    const id = generatePassportId();
    if (!isValidPassportIdFormat(id)) {
      throw new InvalidPassportIdError(id);
    }
    return id;
  }
}

export const passportIdGenerator = new PassportIdGenerator();