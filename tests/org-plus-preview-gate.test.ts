// Production-exclusion test for the staging-only Organization Plus sample preview (B-4 review, 2026-11-27).
// The preview is served ONLY on Vercel preview deployments. Production, development and unset must be refused.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isPreviewServable } from '@/lib/org-plus-preview-gate';

describe('preview gate decision (fail closed)', () => {
  it('serves on a preview deployment', () => {
    expect(isPreviewServable('preview')).toBe(true);
  });
  it.each<[string | undefined]>([['production'], ['development'], [undefined], [''], ['Production'], ['PREVIEW']])(
    'refuses VERCEL_ENV=%s',
    (value) => {
      expect(isPreviewServable(value)).toBe(false);
    },
  );
});

describe('preview page wiring and isolation', () => {
  const pagePath = join(process.cwd(), 'src/app/preview/org-plus-offer/page.tsx');
  const src = readFileSync(pagePath, 'utf8');

  it('the gate runs before any render and calls notFound() when not servable', () => {
    const gate = 'if (!isPreviewServable(process.env.VERCEL_ENV)) notFound();';
    expect(src).toContain(gate);
    expect(src.indexOf(gate)).toBeLessThan(src.indexOf('return ('));
  });

  it('is noindex and uses only static sample data (no DB, network, cookies or auth)', () => {
    expect(src).toContain('robots: { index: false, follow: false }');
    expect(src).not.toMatch(/supabase|fetch\(|cookies\(|headers\(|auth\(|currentUser|getUser/i);
  });

  it('no other source file links to the preview route (keeps it out of sitemap and navigation)', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx|ts|js|mjs|json)$/.test(name) && p !== pagePath && readFileSync(p, 'utf8').includes('/preview/org-plus-offer')) hits.push(p);
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(hits).toEqual([]);
  });
});
