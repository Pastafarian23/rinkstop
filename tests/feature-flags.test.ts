/**
 * tests/feature-flags.test.ts
 *
 * Tests for feature flag behavior. Feature flags are critical safety:
 * they must default to false, and the master switch must override all
 * sub-flags.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isPassportEnabled,
  isPassportInternalApiEnabled,
  isPublicPassportLookupEnabled,
  isPassportMigrationEnabled,
  isPassportEventLoggingEnabled,
} from '@/lib/passport/02-feature-flags';

describe('Feature flag defaults', () => {
  beforeEach(() => {
    // Ensure all flags are unset before each test
    delete process.env.PASSPORT_ENABLED;
    delete process.env.PASSPORT_INTERNAL_API;
    delete process.env.PASSPORT_PUBLIC_LOOKUP;
    delete process.env.PASSPORT_MIGRATION;
    delete process.env.PASSPORT_EVENT_LOGGING;
    delete process.env.PASSPORT_DASHBOARD;
  });

  afterEach(() => {
    delete process.env.PASSPORT_ENABLED;
    delete process.env.PASSPORT_INTERNAL_API;
    delete process.env.PASSPORT_PUBLIC_LOOKUP;
    delete process.env.PASSPORT_MIGRATION;
    delete process.env.PASSPORT_EVENT_LOGGING;
    delete process.env.PASSPORT_DASHBOARD;
  });

  it('master switch defaults to false', () => {
    expect(isPassportEnabled()).toBe(false);
  });

  it('sub-flags default to false', () => {
    expect(isPassportInternalApiEnabled()).toBe(false);
    expect(isPublicPassportLookupEnabled()).toBe(false);
    expect(isPassportMigrationEnabled()).toBe(false);
    expect(isPassportEventLoggingEnabled()).toBe(false);
  });

  it('master switch ON enables sub-flags', () => {
    process.env.PASSPORT_ENABLED = 'true';
    process.env.PASSPORT_INTERNAL_API = 'true';
    expect(isPassportInternalApiEnabled()).toBe(true);
  });

  it('master switch OFF blocks all sub-flags even when set true', () => {
    process.env.PASSPORT_ENABLED = 'false';
    process.env.PASSPORT_INTERNAL_API = 'true';
    process.env.PASSPORT_MIGRATION = 'true';
    process.env.PASSPORT_EVENT_LOGGING = 'true';
    expect(isPassportInternalApiEnabled()).toBe(false);
    expect(isPassportMigrationEnabled()).toBe(false);
    expect(isPassportEventLoggingEnabled()).toBe(false);
  });

  it('non-"true" values are treated as false', () => {
    process.env.PASSPORT_ENABLED = 'TRUE'; // wrong case
    expect(isPassportEnabled()).toBe(false);

    process.env.PASSPORT_ENABLED = '1'; // not "true"
    expect(isPassportEnabled()).toBe(false);

    process.env.PASSPORT_ENABLED = ''; // empty string
    expect(isPassportEnabled()).toBe(false);
  });
});