import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { baseUrl, isHighQualityTeam, teamSitemapUrl } from '@/lib/sitemap-shared';

describe('teamSitemapUrl: URL-safe team <loc> entries', () => {
  it('leaves ordinary slugs unchanged', () => {
    expect(teamSitemapUrl('minnesota-frost')).toBe(`${baseUrl}/directory/teams/minnesota-frost`);
  });

  it('percent-encodes a space in a legacy slug', () => {
    expect(teamSitemapUrl('freiburg-ober sud')).toBe(`${baseUrl}/directory/teams/freiburg-ober%20sud`);
  });

  it('never emits a raw space, ampersand or angle bracket', () => {
    for (const slug of ['a b', 'a&b', 'a<b>c', 'a b&c']) {
      const url = teamSitemapUrl(slug);
      expect(url).not.toMatch(/[ &<>]/);
    }
  });

  it('round-trips: decoding the path segment returns the original slug', () => {
    for (const slug of ['freiburg-ober sud', 'rosenheim-ober sud', 'plain-slug']) {
      const segment = teamSitemapUrl(slug).split('/directory/teams/')[1];
      expect(decodeURIComponent(segment)).toBe(slug);
    }
  });
});

describe('sitemap-teams route wiring', () => {
  const ROUTE = readFileSync(join(process.cwd(), 'src/app/sitemap-teams.xml/route.ts'), 'utf8');

  it('builds each <loc> through teamSitemapUrl, not a raw template', () => {
    expect(ROUTE).toContain('<loc>${teamSitemapUrl(t.slug)}</loc>');
    expect(ROUTE).not.toMatch(/<loc>\$\{baseUrl\}\/directory\/teams\/\$\{t\.slug\}<\/loc>/);
  });

  it('keeps the public-only visibility filter', () => {
    expect(ROUTE).toContain(".eq('visibility', 'public')");
  });
});

describe('isHighQualityTeam is unchanged (counts must not be altered to force a match)', () => {
  it('requires a slug', () => {
    expect(isHighQualityTeam({ country_code: 'US' })).toBe(false);
  });
  it('rejects a bare row with no descriptive fields', () => {
    expect(isHighQualityTeam({ slug: 'bare-team' })).toBe(false);
  });
  it('accepts a row with any one descriptive field', () => {
    expect(isHighQualityTeam({ slug: 'a', country_code: 'US' })).toBe(true);
    expect(isHighQualityTeam({ slug: 'a', home_city: 'Boston' })).toBe(true);
    expect(isHighQualityTeam({ slug: 'a', website_url: 'https://x.test' })).toBe(true);
  });
});
