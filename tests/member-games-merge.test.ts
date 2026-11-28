import { describe, expect, it } from 'vitest';
import { mergeMemberGames } from '@/lib/member-games-merge';

const g = (id: string, at: string, home = 'A', away = 'B') => ({
  id, scheduled_at: at, home_team: { name: home }, away_team: { name: away },
});

describe('mergeMemberGames', () => {
  it('returns the public list untouched when the viewer has no member games', () => {
    const pub = [g('1', '2026-11-30T00:00:00Z')];
    expect(mergeMemberGames(pub, [], '')).toBe(pub);
  });
  it('adds member games and orders everything by scheduled time', () => {
    const pub = [g('1', '2026-11-30T00:00:00Z'), g('3', '2026-12-02T00:00:00Z')];
    const mine = [g('2', '2026-12-01T00:00:00Z', 'Secret', 'Open')];
    expect(mergeMemberGames(pub, mine, '').map((x) => x.id)).toEqual(['1', '2', '3']);
  });
  it('does not duplicate a game already in the public list', () => {
    const pub = [g('1', '2026-11-30T00:00:00Z')];
    expect(mergeMemberGames(pub, [g('1', '2026-11-30T00:00:00Z')], '').length).toBe(1);
  });
  it('applies the text search to member games', () => {
    const mine = [g('2', '2026-12-01T00:00:00Z', 'Secret Team', 'Open'), g('4', '2026-12-03T00:00:00Z', 'Other', 'Open')];
    expect(mergeMemberGames([], mine, 'secret').map((x) => x.id)).toEqual(['2']);
  });
  it('does not mutate its inputs', () => {
    const pub = [g('1', '2026-11-30T00:00:00Z')];
    const mine = [g('2', '2026-12-01T00:00:00Z')];
    mergeMemberGames(pub, mine, '');
    expect(pub.length).toBe(1);
    expect(mine.length).toBe(1);
  });
});
