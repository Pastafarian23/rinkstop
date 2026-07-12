# RinkStop Database Baseline - 2026-07-09
# Generated after Phase 2 teams cleanup + all subagent fills
# Re-run verification:
# curl -s -X POST "https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query" \
#   -H "Authorization: Bearer $(jq -r .pat /root/.openclaw/credentials/supabase.json)" \
#   -H "Content-Type: application/json" \
#   -d '{"query":"SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active, COUNT(*) FILTER (WHERE is_active=false) as inactive FROM public.teams"}' | jq '.'

## Totals
- Total teams: 3243
- Active: 2600
- Inactive: 643
- Leagues with teams: 276+

## League Snapshot (active counts verified)
| League | Active | Historical |
|--------|--------|------------|
| NHL | 32 | 29 |
| AHL | 32 | 2 |
| KHL | 23 | 20 |
| SHL | 14 | 9 |
| Liiga/Finnish Liiga | 15 | 2 |
| NL Swiss | 14 | 2 |
| DEL | 14 | 1 |
| Czech Extraliga | 14 | 13 |
| Slovak Extraliga | 14 | 5 |
| USHL | 16 | 48 |
| OHL | 20 | 36 |
| WHL | 22 | 30 |
| QMJHL | 19 | 291 |
| PWHL | 19 | 0 |
| ECHL | 25 | 5 |
| Hockey Allsvenskan | 12 | 0 |
| DEL2 | 10 | 0 |
| Mestis | 10 | 0 |
| Ligue Magnus | 10 | 0 |
| Alps Hockey League | 10 | 0 |
| Fjordkraft-ligaen | 8 | 0 |
| Metal Ligaen | 9 | 0 |
| Serie A Italy | 8 | 0 |
| Chance Liga | 8 | 0 |
| Erste Liga | 7 | 0 |
| Hokiliiga | 4 | 0 |
| Polish Hockey League | 8 | 0 |
| FPHL | 11 | 0 |
| SPHL | 9 | 0 |
| LNAH | 8 | 0 |
| Oberliga | 9 | 0 |
| Oberliga Nord | 6 | 0 |
| Oberliga Süd | 6 | 0 |
| Swiss League | 8 | 0 |
| Suomi-sarja | 7 | 0 |
| U SPORTS | 12 | 0 |
| 1. divisjon | 8 | 0 |
| 1. Liga Slovakia | 8 | 0 |
| 2. Liga Slovakia | 6 | 0 |
| Optibet hokeja līga | 6 | 0 |
| SDHL Women | 13 | 0 |
| Naisten Liiga | 8 | 0 |
| National team programs | 76 leagues | various |

## Notes
- Friendly International has 1057 teams (includes national team historical matches)
- QMJHL has 310 total (19 active + 291 historical/noise from bad import)
- AJHL has 37 total but 0 active (verify if these should be active)
- Canadian Women's Hockey League has 11 (league folded - 0 active expected)
- Premier Hockey Federation has 6 (0 active - rebranded/replaced)
- Superleague (Ukraine) has 6 (0 active - war suspended)
- 2. Liga - West is a duplicate/bad league record (0 teams, can be removed)
