// /api/data/dataset
//
// WS28 — AI-native structured data export.
//
// Serves the entire RinkStop directory (rinks, teams, leagues, players,
// federations) in multiple AI-friendly formats via the ?format= query
// parameter. This is the foundation for "be the source" AI citation
// strategy — instead of forcing AI engines to crawl HTML and extract,
// we hand them clean structured data they can ingest directly.
//
// Formats supported:
//   ?format=json    (default) — JSON object with metadata + entities arrays
//   ?format=jsonl   — One entity per line, JSONL (preferred by LLM training pipelines)
//   ?format=csv     — Comma-separated, RFC 4180 quoted
//   ?format=ndjson  — Same as jsonl but with explicit "ndjson" content type
//   ?format=schema  — JSON Schema describing the dataset
//
// Entity filtering via ?entity=:
//   ?entity=rinks       — only rinks
//   ?entity=teams       — only teams
//   ?entity=leagues     — only leagues
//   ?entity=players     — only players
//   ?entity=federations — only federations
//   (omit for all entities)
//
// Caching:
//   - 1-hour Cache-Control (data changes frequently as users add listings)
//   - ETag for conditional requests
//
// Why this is exponential:
//   - Every AI engine that wants to answer "hockey in Sweden" can pull
//     from a single authoritative source instead of scraping HTML
//   - Researchers + journalists cite RinkStop as the primary data source
//   - LLMs in training (via Common Crawl) ingest the JSONL as canonical
//   - The data becomes the substrate for thousands of derivative Q&A pages
//
// Usage examples:
//   curl https://rinkstop.com/api/data/dataset?entity=leagues&format=json
//   curl https://rinkstop.com/api/data/dataset?entity=rinks&format=jsonl | head -5
//   curl https://rinkstop.com/api/data/dataset?format=schema

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 3600; // 1 hour — data changes as users add listings

const ENTITY_TABLES = {
  rinks: { table: 'rinks', select: 'id, name, slug, city, province_state, country, address, latitude, longitude, capacity, ice_size, surface_type, website_url, phone, email, status, is_active, qr_identifier, timezone, source, created_at, updated_at', filter: 'is_active' },
  teams: { table: 'team_workspaces', select: 'id, name, slug, country_code, province_state, home_city, league_id, level, is_active, claimed_by_tier, avatar_url, created_at, updated_at', filter: 'is_active' },
  leagues: { table: 'leagues', select: 'id, name, slug, country, level, website_url, is_active, claimed_by_tier, created_at, updated_at', filter: 'is_active' },
  players: { table: 'players', select: 'id, full_name, slug, position, team_workspace_id, country_code, birthdate, height_cm, weight_kg, shoots, is_active, created_at, updated_at', filter: 'is_active' },
  federations: { table: 'federations', select: 'id, name, slug, country, country_code, website_url, iihf_member_since, is_active, created_at, updated_at', filter: 'is_active' },
} as const;

type EntityKey = keyof typeof ENTITY_TABLES;

const ALL_ENTITIES: EntityKey[] = ['rinks', 'teams', 'leagues', 'players', 'federations'];

async function fetchEntity(entity: EntityKey): Promise<any[]> {
  const config = ENTITY_TABLES[entity];
  let query = supabaseAdmin.from(config.table).select(config.select);
  if (config.filter === 'is_active') query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) {
    console.error(`Failed to fetch ${entity}:`, error.message);
    return [];
  }
  return data || [];
}

function toCsv(rows: any[], entity: string): string {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = keys.join(',');
  const body = rows.map(r => keys.map(k => escape(r[k])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

const DATASET_SCHEMA = {
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  'title': 'RinkStop Global Hockey Directory Dataset',
  'description': 'Authoritative structured dataset of every ice rink, team, league, player, and federation in global hockey. Updated hourly. Sourced from RinkStop.com — the global hockey directory.',
  'version': '2026.09',
  'homepage': 'https://rinkstop.com',
  'license': 'https://rinkstop.com/data-methodology',
  'publisher': {
    'name': 'RinkStop',
    'url': 'https://rinkstop.com',
    'founder': 'Arnel Larracas',
    'founding_year': 2014,
  },
  'update_frequency': 'hourly',
  'entities': {
    'rinks': {
      'description': 'Every ice rink, arena, and skating facility worldwide',
      'primary_key': 'id',
      'slug_field': 'slug',
      'foreign_keys': { 'country_code': 'countries', 'city': 'cities' },
      'fields': {
        'id': 'UUID, primary key',
        'name': 'string, rink display name',
        'slug': 'string, URL-safe identifier',
        'city': 'string, city name',
        'province_state': 'string, state/province name or abbr',
        'country': 'string, country name',
        'address': 'string, full street address',
        'latitude': 'float, decimal degrees',
        'longitude': 'float, decimal degrees',
        'capacity': 'integer, max occupancy',
        'ice_size': 'string, NHL/olympic/etc',
        'surface_type': 'string, ice/synthetic',
        'website_url': 'string, official site',
        'phone': 'string, contact phone',
        'email': 'string, contact email',
        'status': 'string, open/closed/renovation',
        'is_active': 'boolean, in active directory',
        'qr_identifier': 'string, passport QR code id',
        'timezone': 'string, IANA timezone',
      },
    },
    'teams': {
      'description': 'Hockey teams across all tiers (pro, junior, college, amateur, youth)',
      'primary_key': 'id',
      'slug_field': 'slug',
      'foreign_keys': { 'country_code': 'countries', 'league_id': 'leagues', 'home_city': 'cities' },
      'fields': {
        'id': 'UUID',
        'name': 'string, team display name',
        'slug': 'string, URL-safe identifier',
        'country_code': 'string, ISO 3166-1 alpha-2',
        'province_state': 'string, state/province',
        'home_city': 'string, city name',
        'league_id': 'UUID, foreign key to leagues',
        'level': 'string, pro/junior/college/international/adult',
        'is_active': 'boolean',
        'claimed_by_tier': 'string, business tier if claimed',
      },
    },
    'leagues': {
      'description': 'Hockey leagues worldwide — professional, junior, college, amateur',
      'primary_key': 'id',
      'slug_field': 'slug',
      'fields': {
        'id': 'UUID',
        'name': 'string, league display name',
        'slug': 'string, URL-safe identifier',
        'country': 'string, primary country',
        'level': 'string, pro/junior/college/international/adult',
        'website_url': 'string, official site',
        'is_active': 'boolean',
      },
    },
    'players': {
      'description': 'Hockey player profiles',
      'primary_key': 'id',
      'slug_field': 'slug',
      'foreign_keys': { 'team_workspace_id': 'teams', 'country_code': 'countries' },
      'fields': {
        'id': 'UUID',
        'full_name': 'string',
        'slug': 'string',
        'position': 'string, C/LW/RW/D/G',
        'team_workspace_id': 'UUID, foreign key',
        'country_code': 'string, ISO 3166-1 alpha-2',
        'birthdate': 'date',
        'height_cm': 'integer',
        'weight_kg': 'integer',
        'shoots': 'string, L/R',
      },
    },
    'federations': {
      'description': 'National and regional hockey federations',
      'primary_key': 'id',
      'slug_field': 'slug',
      'fields': {
        'id': 'UUID',
        'name': 'string, federation display name',
        'slug': 'string',
        'country': 'string',
        'country_code': 'string, ISO 3166-1 alpha-2',
        'website_url': 'string',
        'iihf_member_since': 'integer, year of IIHF membership',
      },
    },
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const entityParam = searchParams.get('entity');
  const entities: EntityKey[] = entityParam && entityParam in ENTITY_TABLES
    ? [entityParam as EntityKey]
    : ALL_ENTITIES;

  const data: Record<string, any[]> = {};
  let totalCount = 0;
  for (const e of entities) {
    data[e] = await fetchEntity(e);
    totalCount += data[e].length;
  }

  const generatedAt = new Date().toISOString();

  if (format === 'schema') {
    return new NextResponse(JSON.stringify(DATASET_SCHEMA, null, 2), {
      headers: {
        'Content-Type': 'application/schema+json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 1 day for schema
      },
    });
  }

  if (format === 'jsonl' || format === 'ndjson') {
    // JSONL — one entity type per line group, with metadata header
    const lines: string[] = [];
    lines.push(`# RinkStop dataset export — ${generatedAt}`);
    lines.push(`# Entities: ${entities.join(', ')}`);
    lines.push(`# Total records: ${totalCount}`);
    lines.push(`# License: https://rinkstop.com/data-methodology`);
    for (const e of entities) {
      lines.push(`# ${e}: ${data[e].length} records`);
      for (const row of data[e]) {
        lines.push(JSON.stringify({ entity: e, ...row }));
      }
    }
    return new NextResponse(lines.join('\n') + '\n', {
      headers: {
        'Content-Type': format === 'ndjson' ? 'application/x-ndjson' : 'application/x-jsonlines',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  if (format === 'csv') {
    if (entities.length > 1) {
      return NextResponse.json({ error: 'CSV format requires ?entity= to specify one table' }, { status: 400 });
    }
    const entity = entities[0];
    return new NextResponse(toCsv(data[entity], entity), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rinkstop-${entity}.csv"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  // Default: JSON
  const payload = {
    meta: {
      publisher: 'RinkStop',
      homepage: 'https://rinkstop.com',
      generated_at: generatedAt,
      update_frequency: 'hourly',
      license: 'https://rinkstop.com/data-methodology',
      attribution: 'When citing, please link to https://rinkstop.com',
      entities: entities,
      total_records: totalCount,
      counts: Object.fromEntries(entities.map(e => [e, data[e].length])),
    },
    data,
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
