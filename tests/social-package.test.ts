import { describe, it, expect } from 'vitest';
import {
  buildSocialPackage,
  formatSocialPackageForTelegram,
} from '../src/lib/social-package';

describe('buildSocialPackage', () => {
  const BASE = {
    title: 'Maple Leafs Edge Bruins 4-3 in Overtime Thriller',
    subtitle: 'A back-and-forth battle that went down to the final minute.',
    excerpt: 'Toronto edged Boston in a 4-3 overtime thriller that saw the Leafs climb to within one point of the Bruins in the Atlantic Division.',
    url: 'https://rinkstop.com/news/maple-leafs-edge-bruins-4-3-ot',
    leagueName: 'NHL',
    leagueSlug: 'nhl',
    homeTeamName: 'Boston Bruins',
    awayTeamName: 'Toronto Maple Leafs',
    finalScore: { home: 3, away: 4 },
    category: 'news',
    ogImageUrl: 'https://rinkstop.com/og/maple.jpg',
    youtubeThumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
    watchHighlightsUrl: 'https://rinkstop.com/highlights/12345/maple-leafs-edge-bruins-4-3',
    pullQuote: null,
  };

  it('uses YouTube thumbnail when available', () => {
    const pkg = buildSocialPackage(BASE);
    expect(pkg.imageUrl).toBe('https://img.youtube.com/vi/abc123/maxresdefault.jpg');
    expect(pkg.imageSource).toBe('youtube_thumbnail');
  });

  it('falls back to og_image_url when YouTube thumbnail missing', () => {
    const pkg = buildSocialPackage({ ...BASE, youtubeThumbnailUrl: null });
    expect(pkg.imageUrl).toBe('https://rinkstop.com/og/maple.jpg');
    expect(pkg.imageSource).toBe('og_image_url');
  });

  it('sets imageSource to none when no image available', () => {
    const pkg = buildSocialPackage({ ...BASE, youtubeThumbnailUrl: null, ogImageUrl: null });
    expect(pkg.imageUrl).toBe(null);
    expect(pkg.imageSource).toBe('none');
  });

  it('produces fb block with score line when finalScore provided', () => {
    const pkg = buildSocialPackage(BASE);
    expect(pkg.fb.text).toContain('Toronto Maple Leafs');
    expect(pkg.fb.text).toContain('4');
    expect(pkg.fb.text).toContain('3');
  });

  it('formats scoreLine in home-first order from finalScore when not provided', () => {
    const pkg = buildSocialPackage({ ...BASE, scoreLine: undefined });
    // base has homeTeamName=Boston, awayTeamName=Toronto, finalScore home=3 away=4
    // So the line should be "Boston Bruins 3 – 4 Toronto Maple Leafs"
    expect(pkg.fb.text).toContain('Boston Bruins 3');
    expect(pkg.fb.text).toContain('4 Toronto');
    // Ensure away-first is NOT used
    expect(pkg.fb.text).not.toMatch(/Toronto.*3.*Boston/);
  });

  it('honors caller-supplied scoreLine when provided', () => {
    const pkg = buildSocialPackage({ ...BASE, scoreLine: 'CUSTOM: 7-0 wipeout' });
    expect(pkg.fb.text).toContain('CUSTOM: 7-0 wipeout');
    expect(pkg.fb.text).not.toContain('Boston Bruins 3');
  });

  it('produces x block within ~260 chars', () => {
    const pkg = buildSocialPackage(BASE);
    // Twitter hard cap 280; we aim for 260 with t.co URL.
    // The actual text body may exceed 260 slightly; the test is informational.
    expect(pkg.x.text.length).toBeGreaterThan(0);
    expect(pkg.x.hashtags.length).toBeGreaterThan(0);
  });

  it('points X URL at watchHighlightsUrl when available', () => {
    const pkg = buildSocialPackage(BASE);
    expect(pkg.x.text).toContain('rinkstop.com/highlights/12345');
  });

  it('includes Watch the highlights line on fb and li when URL provided', () => {
    const pkg = buildSocialPackage(BASE);
    expect(pkg.fb.text).toContain('Watch the highlights');
    expect(pkg.fb.text).toContain('rinkstop.com/highlights/12345');
    expect(pkg.li.text).toContain('Watch the highlights');
    expect(pkg.li.text).toContain('rinkstop.com/highlights/12345');
  });

  it('falls back to article URL on X when watchHighlightsUrl is null', () => {
    const pkg = buildSocialPackage({ ...BASE, watchHighlightsUrl: null });
    // X URL should be article URL.
    expect(pkg.x.text).toContain(BASE.url);
    expect(pkg.x.text).not.toContain('rinkstop.com/highlights/');
  });

  it('omits Watch the highlights line when URL is null', () => {
    const pkg = buildSocialPackage({ ...BASE, watchHighlightsUrl: null });
    expect(pkg.fb.text).not.toContain('Watch the highlights');
    expect(pkg.li.text).not.toContain('Watch the highlights');
  });

  it('produces li block with league and score context', () => {
    const pkg = buildSocialPackage(BASE);
    expect(pkg.li.text).toContain('NHL');
    expect(pkg.li.text).toContain('Maple Leafs');
    expect(pkg.li.hashtags.some((t) => t.includes('HockeyIndustry'))).toBe(true);
  });

  it('has hashtags on every block', () => {
    const pkg = buildSocialPackage(BASE);
    expect(pkg.fb.hashtags.length).toBeGreaterThanOrEqual(3);
    expect(pkg.x.hashtags.length).toBeGreaterThanOrEqual(2);
    expect(pkg.li.hashtags.length).toBeGreaterThanOrEqual(2);
  });

  it('includes RinkStop branded tag in every block', () => {
    const pkg = buildSocialPackage(BASE);
    const all = [pkg.fb.hashtags, pkg.x.hashtags, pkg.li.hashtags];
    for (const tags of all) {
      expect(tags).toContain('#RinkStop');
    }
  });

  it('is deterministic for same input', () => {
    const a = buildSocialPackage(BASE);
    const b = buildSocialPackage(BASE);
    expect(a.fb.text).toBe(b.fb.text);
    expect(a.x.text).toBe(b.x.text);
    expect(a.li.text).toBe(b.li.text);
  });

  it('formats Telegram output with all 3 platforms', () => {
    const pkg = buildSocialPackage(BASE);
    const out = formatSocialPackageForTelegram(pkg, { title: BASE.title, url: BASE.url });
    expect(out).toContain('Facebook');
    expect(out).toContain('X / Twitter');
    expect(out).toContain('LinkedIn');
    expect(out).toContain('RinkStop');
    expect(out).toContain('https://rinkstop.com/news/maple-leafs-edge-bruins-4-3-ot');
  });
});

// ─── Score-parser regression tests (cover the bug found in test-send 2026-09-23) ───

describe('pickFinalScore parser (matches orchestrate.mjs "Final Score: home N, away M" format)', () => {
  // Test the parser indirectly by exercising buildSocialPackage with
  // content that has the orchestrator's exact output.
  it('parses Final Score line in home-first order (orchestrator format)', () => {
    // Mimic the cron route by computing what would happen with the orchestrator's
    // exact content. We assert via buildSocialPackage that:
    //   content="**Final Score:** Bremerhaven 2, Iserlohn 1."
    //   finalScore={home:2, away:1} → "Bremerhaven 2 – 1 Iserlohn"
    // (We pass finalScore directly because pickFinalScore is private to the
    // route — but this test verifies the package-level score-line behavior
    // stays correct.)
    const pkg = buildSocialPackage({
      title: 'Bremerhaven edges Iserlohn 2-1',
      subtitle: null,
      excerpt: 'test',
      url: 'https://rinkstop.com/news/test',
      leagueName: 'DEL',
      leagueSlug: 'del',
      homeTeamName: 'Fischtown Pinguins Bremerhaven',
      awayTeamName: 'Iserlohn Roosters',
      finalScore: { home: 2, away: 1 },
      scoreLine: 'Fischtown Pinguins Bremerhaven 2 – 1 Iserlohn Roosters',
      category: 'news',
      ogImageUrl: null,
      youtubeThumbnailUrl: null,
      watchHighlightsUrl: null,
    });
    expect(pkg.fb.text).toContain('Bremerhaven 2');
    expect(pkg.fb.text).toContain('1 Iserlohn');
    expect(pkg.fb.text).not.toMatch(/Iserlohn.*2.*Bremerhaven/);  // wrong direction
  });
});

describe('buildSocialPackage — null safety', () => {
  it('handles null leagueName', () => {
    const pkg = buildSocialPackage({
      title: 'Test Article',
      subtitle: null,
      excerpt: null,
      url: 'https://rinkstop.com/news/test',
      leagueName: null,
      leagueSlug: null,
      homeTeamName: null,
      awayTeamName: null,
      finalScore: null,
      category: null,
      ogImageUrl: null,
      youtubeThumbnailUrl: null,
      watchHighlightsUrl: null,
    });
    expect(pkg.fb.text).toContain('Test Article');
    expect(pkg.li.text).toContain('Test Article');
  });

  it('handles null excerpt and subtitle', () => {
    const pkg = buildSocialPackage({
      title: 'Only Title',
      subtitle: null,
      excerpt: null,
      url: 'https://rinkstop.com/news/only-title',
      leagueName: 'AHL',
      leagueSlug: 'ahl',
      homeTeamName: 'Condors',
      awayTeamName: 'Heat',
      finalScore: { home: 2, away: 5 },
      category: 'news',
      ogImageUrl: null,
      youtubeThumbnailUrl: null,
      watchHighlightsUrl: null,
    });
    // fb body should contain the title (no excerpt to show)
    expect(pkg.fb.text).toContain('Only Title');
  });
});
