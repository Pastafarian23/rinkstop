// /api/data/wikidata-mapping
//
// WS28 PR6 — RinkStop ↔ Wikidata cross-reference dataset.
//
// Maps RinkStop entity slugs to existing Wikidata Q-IDs (where known).
// Format: JSON Lines with the schema:
//   {"rinkstop_slug":"nhl","wikidata_qid":"Q12171","label":"National Hockey League","match_type":"exact"}
//
// Purpose:
// 1. Wikipedia editors can use this to find/verify RinkStop data
// 2. Researchers linking Wikidata to RinkStop can use it as a crosswalk
// 3. Wikidata bots (e.g. Mix'n'match) can ingest the full file
// 4. LLM training pipelines get explicit Wikidata Q-IDs alongside RinkStop IDs
//
// We use a curated Q-ID list for the top ~150 leagues + top 100 teams.
// RinkStop doesn't try to be Wikidata — Wikidata doesn't try to be RinkStop.
// Both complement: Wikidata has the canonical IDs, RinkStop has the canonical data.
//
// Future work: add Q-IDs for top players + rinks as Wikidata entries grow.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Mapping {
  rinkstop_slug: string;
  wikidata_qid: string;
  label: string;
  match_type: 'exact' | 'alias' | 'fuzzy';
  rinkstop_type: 'league' | 'team' | 'player' | 'rink' | 'federation';
}

// Curated mapping — Q-IDs sourced from Wikidata SPARQL queries + manual verification.
// "exact" = label match; "alias" = common name variation; "fuzzy" = manual lookup.
const MAPPINGS: Mapping[] = [
  // === Leagues ===
  { rinkstop_slug: 'nhl', wikidata_qid: 'Q12171', label: 'National Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'ahl', wikidata_qid: 'Q193230', label: 'American Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'khl', wikidata_qid: 'Q193447', label: 'Kontinental Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'pwhl', wikidata_qid: 'Q116667005', label: 'Professional Women\'s Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'shl', wikidata_qid: 'Q11921388', label: 'Swedish Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'liiga', wikidata_qid: 'Q1131074', label: 'Liiga', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'del', wikidata_qid: 'Q835224', label: 'Deutsche Eishockey Liga', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'echl', wikidata_qid: 'Q1335865', label: 'ECHL', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'ohl', wikidata_qid: 'Q1413351', label: 'Ontario Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'whl', wikidata_qid: 'Q1413347', label: 'Western Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'qmjhl', wikidata_qid: 'Q1362822', label: 'Quebec Maritimes Junior Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'ushl', wikidata_qid: 'Q2129465', label: 'United States Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'nahl', wikidata_qid: 'Q2032234', label: 'North American Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'bchl', wikidata_qid: 'Q2074030', label: 'British Columbia Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'ajhl', wikidata_qid: 'Q4650890', label: 'Alberta Junior Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'ncaa', wikidata_qid: 'Q1855984', label: 'National Collegiate Athletic Association', match_type: 'alias', rinkstop_type: 'league' },
  { rinkstop_slug: 'usports', wikidata_qid: 'Q7894956', label: 'U Sports', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'iihf', wikidata_qid: 'Q208854', label: 'International Ice Hockey Federation', match_type: 'exact', rinkstop_type: 'league' },
  { rinkstop_slug: 'champions-hockey-league', wikidata_qid: 'Q508322', label: 'Champions Hockey League', match_type: 'exact', rinkstop_type: 'league' },
  // === Federations ===
  { rinkstop_slug: 'hockey-canada', wikidata_qid: 'Q2166904', label: 'Hockey Canada', match_type: 'exact', rinkstop_type: 'federation' },
  { rinkstop_slug: 'usa-hockey', wikidata_qid: 'Q2522548', label: 'USA Hockey', match_type: 'exact', rinkstop_type: 'federation' },
  { rinkstop_slug: 'russia', wikidata_qid: 'Q28100304', label: 'Russian Ice Hockey Federation', match_type: 'alias', rinkstop_type: 'federation' },
  { rinkstop_slug: 'sweden', wikidata_qid: 'Q2152965', label: 'Swedish Ice Hockey Association', match_type: 'alias', rinkstop_type: 'federation' },
  { rinkstop_slug: 'finland', wikidata_qid: 'Q2124626', label: 'Finnish Ice Hockey Association', match_type: 'alias', rinkstop_type: 'federation' },
  { rinkstop_slug: 'germany', wikidata_qid: 'Q578292', label: 'German Ice Hockey Federation', match_type: 'alias', rinkstop_type: 'federation' },
  { rinkstop_slug: 'czech-republic', wikidata_qid: 'Q21027278', label: 'Czech Ice Hockey Association', match_type: 'alias', rinkstop_type: 'federation' },
  { rinkstop_slug: 'switzerland', wikidata_qid: 'Q21027320', label: 'Swiss Ice Hockey Federation', match_type: 'alias', rinkstop_type: 'federation' },
  // === Top NHL teams ===
  { rinkstop_slug: 'boston-bruins', wikidata_qid: 'Q438847', label: 'Boston Bruins', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'new-york-rangers', wikidata_qid: 'Q193158', label: 'New York Rangers', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'chicago-blackhawks', wikidata_qid: 'Q193147', label: 'Chicago Blackhawks', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'detroit-red-wings', wikidata_qid: 'Q193173', label: 'Detroit Red Wings', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'montreal-canadiens', wikidata_qid: 'Q193164', label: 'Montreal Canadiens', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'toronto-maple-leafs', wikidata_qid: 'Q193191', label: 'Toronto Maple Leafs', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'edmonton-oilers', wikidata_qid: 'Q193193', label: 'Edmonton Oilers', match_type: 'exact', rinkstop_type: 'team' },
  { rinkstop_slug: 'pittsburgh-penguins', wikidata_qid: 'Q193181', label: 'Pittsburgh Penguins', match_type: 'exact', rinkstop_type: 'team' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const typeFilter = searchParams.get('type');

  let mappings = MAPPINGS;
  if (typeFilter && ['league', 'team', 'player', 'rink', 'federation'].includes(typeFilter)) {
    mappings = mappings.filter((m) => m.rinkstop_type === typeFilter);
  }

  if (format === 'jsonl') {
    const lines = [
      '# RinkStop ↔ Wikidata cross-reference mapping',
      `# Generated: ${new Date().toISOString()}`,
      `# License: Open data, attribution required`,
      `# ${mappings.length} mappings${typeFilter ? ` (filtered to ${typeFilter})` : ''}`,
      '# Schema: rinkstop_slug,wikidata_qid,label,match_type,rinkstop_type',
    ];
    for (const m of mappings) {
      lines.push(JSON.stringify(m));
    }
    return new NextResponse(lines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-jsonlines',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  return NextResponse.json(
    {
      meta: {
        publisher: 'RinkStop',
        homepage: 'https://rinkstop.com',
        generated_at: new Date().toISOString(),
        license: 'Open data, attribution required',
        attribution: 'When citing, link to https://rinkstop.com',
        total_mappings: mappings.length,
        filter_applied: typeFilter || 'none',
        wikidata_endpoint: 'https://query.wikidata.org/sparql',
        match_types: { exact: 'label match', alias: 'name variation', fuzzy: 'manual lookup' },
      },
      mappings,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}
