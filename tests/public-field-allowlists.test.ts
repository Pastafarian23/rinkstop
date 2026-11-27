import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_PUBLIC_FIELD_PARTS,
  LEAGUE_PUBLIC_COLUMNS,
  RINK_PUBLIC_COLUMNS,
  TEAM_PUBLIC_COLUMNS,
  selectedColumnNames,
} from '@/lib/public-directory-fields';

const lists = { leagues: LEAGUE_PUBLIC_COLUMNS, rinks: RINK_PUBLIC_COLUMNS, teams: TEAM_PUBLIC_COLUMNS };

describe('public directory column allowlists', () => {
  for (const [name, list] of Object.entries(lists)) {
    it(`${name}: no select-star and no private field names`, () => {
      expect(list).not.toContain('*');
      for (const col of selectedColumnNames(list)) {
        for (const bad of FORBIDDEN_PUBLIC_FIELD_PARTS) {
          expect(col.includes(bad), `${name} selects "${col}"`).toBe(false);
        }
      }
    });
  }

  it('leagues: keeps the fields the directory renders and drops internal ones', () => {
    const cols = selectedColumnNames(LEAGUE_PUBLIC_COLUMNS);
    for (const need of ['id', 'name', 'slug', 'country', 'level', 'is_active']) {
      expect(cols).toContain(need);
    }
    for (const internal of ['merged_into_id', 'logo_source', 'logo_verified_at']) {
      expect(cols).not.toContain(internal);
    }
  });

  it('teams: keeps the profile fields the directory uses (federation, league, org links)', () => {
    const cols = selectedColumnNames(TEAM_PUBLIC_COLUMNS);
    for (const need of ['id', 'name', 'slug', 'federation_id', 'league_id', 'organization_id']) {
      expect(cols).toContain(need);
    }
  });
});
