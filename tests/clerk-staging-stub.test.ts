import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { auth, clerkMiddleware, currentUser, useUser } from '../staging-stubs/clerk-signed-out';

const require = createRequire(import.meta.url);

describe('staging Clerk stub is signed out and fails closed', () => {
  it('auth() reports no user', async () => {
    const a = await auth();
    expect(a.userId).toBeNull();
    expect(a.sessionClaims).toBeNull();
  });

  it('auth.protect() throws instead of allowing access', () => {
    expect(() => (auth as any).protect()).toThrow(/must not be served/);
  });

  it('currentUser() is null and useUser() reports signed out', async () => {
    expect(await currentUser()).toBeNull();
    expect(useUser().isSignedIn).toBe(false);
  });

  it('clerkMiddleware passes the signed-out auth to the app handler', async () => {
    let seen: unknown = null;
    const mw = clerkMiddleware(async (a: any) => {
      seen = (await a()).userId;
      return 'ran';
    });
    expect(await mw(new Request('http://localhost/x'))).toBe('ran');
    expect(seen).toBeNull();
  });
});

describe('next.config gating of the staging stub', () => {
  function webpackFor(env: Record<string, string | undefined>) {
    const saved: Record<string, string | undefined> = {};
    for (const k of Object.keys(env)) { saved[k] = process.env[k]; }
    Object.assign(process.env, env);
    try {
      const cfg = require('../next.config.js');
      const config: any = { resolve: { alias: {} } };
      return cfg.webpack(config);
    } finally {
      for (const k of Object.keys(env)) {
        if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
      }
    }
  }

  it('does not alias Clerk when the flag is absent (production behaviour)', () => {
    const cfg = webpackFor({ CLERK_STAGING_STUB: undefined, VERCEL_ENV: 'production' });
    expect(cfg.resolve.alias['@clerk/nextjs$']).toBeUndefined();
  });

  it('aliases Clerk to the signed-out stub on a non-production Preview build', () => {
    const cfg = webpackFor({ CLERK_STAGING_STUB: '1', VERCEL_ENV: 'preview' });
    expect(cfg.resolve.alias['@clerk/nextjs$']).toMatch(/clerk-signed-out\.ts$/);
    expect(cfg.resolve.alias['@clerk/nextjs/server$']).toMatch(/clerk-signed-out\.ts$/);
  });

  it('refuses to build with the stub flag set for a production build', () => {
    expect(() => webpackFor({ CLERK_STAGING_STUB: '1', VERCEL_ENV: 'production' })).toThrow(/must never be set/);
  });
});
