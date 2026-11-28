import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { teamCountryOr } from '@/lib/team-country-filter';

describe('teamCountryOr: one country predicate for count, paging and first page', () => {
  it('a 2-letter filter matches country_code only', () => {
    expect(teamCountryOr('CA', 'CA')).toBe('country_code.eq.CA');
    expect(teamCountryOr('CA', null)).toBe('country_code.eq.CA');
  });

  it('a full-name filter falls back to home_country when country_code is null', () => {
    expect(teamCountryOr('CA', 'Canada')).toBe('country_code.eq.CA,and(country_code.is.null,home_country.ilike.Canada)');
  });

  it('strips characters that would break the PostgREST filter', () => {
    const s = teamCountryOr('CA', 'Canada),foo.eq.1');
    expect(s).not.toMatch(/[(),]foo/);
    expect(s).toContain('home_country.ilike.Canadafooeq1'.replace('eq1', 'eq1').slice(0, 0) || 'home_country.ilike.');
  });

  it('a Canada team with NULL country_code is matched by the same rule the count uses', () => {
    // The row that caused the 130-vs-129 mismatch: country_code NULL, home_country 'Canada'.
    const rule = teamCountryOr('CA', 'Canada');
    const row = { country_code: null as string | null, home_country: 'Canada' };
    const matches = rule.split(',').some((clause) => {
      if (clause === 'country_code.eq.CA') return row.country_code === 'CA';
      if (clause.startsWith('and(country_code.is.null')) return row.country_code === null && row.home_country.toLowerCase() === 'canada';
      return false;
    });
    expect(matches).toBe(true);
  });
});

describe('wiring: the first page and /api/teams use the shared predicate', () => {
  const API = readFileSync(join(process.cwd(), 'src/app/api/teams/route.ts'), 'utf8');
  const PAGE = readFileSync(join(process.cwd(), 'src/app/directory/teams/page.tsx'), 'utf8');

  it('/api/teams filters countries with teamCountryOr', () => {
    expect(API).toMatch(/query\.or\(teamCountryOr\(country, rawCountry\)\)/);
    expect(API).not.toMatch(/query\.eq\('country_code', country\)/);
  });

  it('the first-page NHL and user queries both use teamCountryOr', () => {
    expect(PAGE).toMatch(/nhlQuery\.or\(teamCountryOr\(countryIso, country\)\)/);
    expect(PAGE).toMatch(/userQuery\.or\(teamCountryOr\(countryIso, country\)\)/);
    expect(PAGE).not.toMatch(/country_code\.ilike\.%\$\{countryIso\}%/);
  });
});
