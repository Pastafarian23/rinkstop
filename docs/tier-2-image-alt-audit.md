# Tier 2 — Image Alt-Text Audit (2026-07-08)

## Scope
- `src/app/directory/**` (rink, team, player, league, brand, game, NHL pages)
- `src/components/CityPageContent.tsx` (city tier — 815+ URLs)
- `src/components/CountryPageContent.tsx` (country tier — 155 URLs)
- `src/components/StateProvincePageContent.tsx` (state/province tier — 760 URLs)

## Findings

### Category 1 — Content images with `alt=""` (BAD: should be descriptive)
The image is content (team logo, player headshot, cover photo, og image) but alt is empty. Screen readers skip it AND Google Image Search can't index it.

| File:Line | Image | Suggested alt |
|---|---|---|
| `app/directory/leagues/[id]/LeagueDetailClient.tsx:51` | `league.logo_url` | `${league.name} logo` |
| `app/directory/leagues/[id]/LeagueDetailClient.tsx:107` | `a.og_image_url` (related article card) | `${a.title}` or `decorative` if it duplicates a link |
| `app/directory/teams/[slug]/TeamDetailClient.tsx:89` | `team.logo_url` | `${team.name} logo` |
| `app/directory/teams/[slug]/TeamDetailClient.tsx:342` | `p.headshot_url` (player card) | `${p.name} headshot` |
| `app/directory/teams/[slug]/TeamDetailClient.tsx:372` | `a.og_image_url` (related article) | `${a.title}` |
| `app/directory/teams/TeamsIndexClient.tsx:412` | team logo | `${team.name} logo` |
| `app/directory/rinks/[slug]/page.tsx:633` | team logo in section | `${t.name} logo` |
| `app/directory/rinks/[slug]/page.tsx:676` | league logo in section | `${l.name} logo` |
| `app/directory/rinks/RinksIndexClient.tsx:295` | static map | decorative (map is below the rink name, redundant) |
| `app/directory/players/PlayersIndexClient.tsx:301` | headshot in index row | `${player.full_name} headshot` |
| `app/directory/players/[id]/PlayerDetailClient.tsx:512` | team logo | `${player.teams.name} logo` |
| `app/directory/players/[id]/PlayerDetailClient.tsx:841` | headshot (related) | `${p.full_name} headshot` |
| `app/directory/players/[id]/PlayerDetailClient.tsx:891` | og_image related article | `${a.title}` |
| `app/directory/nhl/teams/[slug]/page.tsx:215` | team logo | `${team.name} logo` ✅ already good |
| `app/directory/nhl/games/[slug]/page.tsx:180,212` | game team logos | `${match.away_team_name} logo` ✅ already good |
| `app/directory/nhl/schedule/page.tsx:77,96` | team logos | `${team.name} logo` |
| `app/directory/nhl/playoffs/NHLPlayoffsClient.tsx:167,175` | team logos | `${s.awayName} / ${s.homeName} logo` |
| `app/directory/nhl/standings/page.tsx:59` | team logo in standings row | `${r.team_name} logo` |
| `app/directory/games/GamesIndexClient.tsx:84,121` | team logos in index | `${team.name} logo` |
| `app/directory/games/[id]/page.tsx:120,157` | team logos on game detail | `${team.name} logo` |
| `app/directory/ahl/playoffs/AHLPlayoffsClient.tsx:101,109` | team logos | `${team_name} logo` |
| `app/directory/pwhl/PWHLClient.tsx:133` | team logo | `${team.name} logo` |
| `app/directory/brands/[id]/page.tsx:72` | brand logo | `${brand.name} logo` ✅ already good |
| `components/CountryPageContent.tsx:396,425` | league + team logos | `${l.name} logo`, `${team.name} logo` |
| `components/CountryPageContent.tsx:462` | player headshot | `${p.full_name} headshot` |

### Category 2 — Decorative images (KEEP `alt=""`)
- `components/ClaimedBy.tsx:74` — UserMenu avatar — already has `alt={displayName}`. ✅
- The static map in RinksIndexClient is decorative (the rink name is right next to it). Leave as `alt=""`.
- Ad components (HockeyCanadaAd, NHLShopWidget, TicketmasterAd) — these are ads, branding already in the link text. Leave as `alt=""`.

### Category 3 — Need to verify: is the image inside a link?
For `og_image_url` in card grids: if the image is inside an `<a>` tag with the article title as link text, the image should have `alt=""` (decorative) because the link text already describes it. If the image is the only content of the link, the image alt must be the article title.

## Plan
1. Fix Category 1: replace `alt=""` with the appropriate descriptive alt in each component.
2. Verify Category 3 on the related-article cards (LeagueDetailClient:107, TeamDetailClient:372, PlayerDetailClient:891) — likely decorative since link text is the title.
3. Skip Category 2.
4. Build + deploy.
5. Verify with a curl that the alt attribute is now in the HTML.

## Out of scope (Tier 2 next pass)
- Image optimization (next/image, srcset, sizes)
- Lazy loading beyond what's already set
- Format migration (WebP)
- CDN configuration

These are bigger refactors. Tier 2 is alt-text only.
