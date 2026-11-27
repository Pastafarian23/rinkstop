import { describe, it, expect } from 'vitest';
import { browseDirectoryCopy, US_BROWSE_COPY } from '@/lib/city-browse-copy';

describe('city browse copy: country-specific wording', () => {
  it('Canada keeps the correct Canada wording', () => {
    expect(browseDirectoryCopy('Canada')).toBe('leagues, teams, and rink details across Canada.');
  });

  it('Oslo / Norway says Norway, never Canada', () => {
    const copy = browseDirectoryCopy('Norway');
    expect(copy).toBe('leagues, teams, and rink details across Norway.');
    expect(copy).not.toContain('Canada');
  });

  it('Mexico City / Mexico says Mexico, never Canada', () => {
    const copy = browseDirectoryCopy('Mexico');
    expect(copy).toBe('leagues, teams, and rink details across Mexico.');
    expect(copy).not.toContain('Canada');
  });

  it('Jakarta / Indonesia says Indonesia, never Canada', () => {
    const copy = browseDirectoryCopy('Indonesia');
    expect(copy).toBe('leagues, teams, and rink details across Indonesia.');
    expect(copy).not.toContain('Canada');
  });

  it('United States keeps its existing wording exactly', () => {
    expect(browseDirectoryCopy('United States')).toBe(US_BROWSE_COPY);
    expect(US_BROWSE_COPY).toBe('leagues, teams, and rink details, plus links to upcoming games and standings.');
  });

  it('the nine affected sample pages no longer say Canada', () => {
    const affected = ['Norway', 'Mexico', 'Bosnia And Herzegovina', 'Serbia', 'Germany', 'Russia', 'Indonesia', 'Switzerland', 'France'];
    for (const country of affected) {
      expect(browseDirectoryCopy(country)).toBe(`leagues, teams, and rink details across ${country}.`);
      expect(browseDirectoryCopy(country)).not.toContain('Canada');
    }
  });

  it('a Canadian city in the sample (Longueuil, Salmon Arm, Lethbridge) still says Canada', () => {
    expect(browseDirectoryCopy('Canada')).toContain('across Canada');
  });
});

describe('city browse copy: missing country fallback', () => {
  it('null country omits the region phrase instead of naming a country', () => {
    const copy = browseDirectoryCopy(null);
    expect(copy).toBe('leagues, teams, and rink details.');
    expect(copy).not.toContain('Canada');
  });

  it('undefined and blank country behave the same way', () => {
    expect(browseDirectoryCopy(undefined)).toBe('leagues, teams, and rink details.');
    expect(browseDirectoryCopy('   ')).toBe('leagues, teams, and rink details.');
  });

  it('trims surrounding whitespace from a real country name', () => {
    expect(browseDirectoryCopy('  Norway ')).toBe('leagues, teams, and rink details across Norway.');
  });
});
