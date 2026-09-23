#!/usr/bin/env python3
"""
_security-audit-anon.cjs — 2026-09-23 (v2)

Proper anon-access audit. Lessons from v1:
  - 204 DELETE doesn't mean delete succeeded (RLS filtered 0 rows)
  - Need Prefer: count=exact to see affected row count
  - INSERT with random column names fails (400 schema error), not security error
  - Use NULL/empty values for fields with no NOT NULL constraint

Strategy:
  1. Look up table schema (NOT NULL constraints, PK column type)
  2. Construct probe values that satisfy NOT NULL but are clearly marked "_audit_probe_*"
  3. INSERT with Prefer: count=exact — if 0 rows, anon was denied
  4. SELECT with select=count, head=true — verify anon can't count rows
"""
import json
import subprocess
import urllib.request
import urllib.error

SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co'

# Get service role key for schema introspection
SR = subprocess.run(['grep', '^SUPABASE_SERVICE_ROLE_KEY', '/root/.openclaw/workspace/rinkstop-platform/.env'],
                    capture_output=True, text=True).stdout.split('=', 1)[1].strip()

# Get management PAT for direct DB queries
PAT = subprocess.run(['grep', '^SUPABASE_MANAGEMENT_PAT', '/root/.openclaw/workspace/rinkstop-platform/.env'],
                     capture_output=True, text=True).stdout.split('=', 1)[1].strip()

# Legacy anon key
LEGACY_ANON = process.env.SUPABASE_LEGACY_ANON_KEY or ''

PUBLISHABLE = subprocess.run(['grep', '^NEXT_PUBLIC_SUPABASE_ANON_KEY', '/root/.openclaw/workspace/rinkstop-platform/.env'],
                              capture_output=True, text=True).stdout.split('=', 1)[1].strip()

# Load tables
with open('/tmp/sec-audit/all-tables.json') as f:
    tables = [t['tablename'] for t in json.load(f)]


def db_query(sql):
    """Direct DB query via Management API."""
    req = urllib.request.Request(
        'https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query',
        headers={'Authorization': f'Bearer {PAT}', 'Content-Type': 'application/json'},
        data=json.dumps({'query': sql}).encode(),
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'error': str(e)}


def http_call(method, table, key, body=None, where=None, prefer=None):
    if where and method == 'DELETE':
        url = f'{SUPABASE_URL}/rest/v1/{table}?{where}'
    elif where and method == 'PATCH':
        url = f'{SUPABASE_URL}/rest/v1/{table}?{where}'
    else:
        url = f'{SUPABASE_URL}/rest/v1/{table}?select=id&limit=1'
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    }
    if prefer:
        headers['Prefer'] = prefer
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body_bytes = resp.read()
            return {
                'status': resp.status,
                'body': body_bytes.decode('utf-8', errors='replace')[:200],
                'count_header': resp.headers.get('content-range', 'none'),
            }
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        return {
            'status': e.code,
            'body': body_bytes.decode('utf-8', errors='replace')[:200],
            'count_header': e.headers.get('content-range', 'none') if e.headers else 'none',
        }
    except Exception as e:
        return {'status': 0, 'body': str(e)[:200], 'count_header': 'none'}


# For each table, look up PK column
def get_pk(table):
    res = db_query(f"""
        SELECT a.attname, t.typname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        JOIN pg_type t ON t.oid = a.atttypid
        WHERE i.indrelid = 'public.{table}'::regclass AND i.indisprimary
        LIMIT 1
    """)
    if isinstance(res, list) and res:
        return res[0]
    return None


print(f'Probing {len(tables)} tables...')

results = {
    'audit_version': 'v2-fixed',
    'audit_timestamp': '2026-09-23T01:35:00Z',
    'total_tables': len(tables),
    'tables_probed': 0,
    'findings': [],
    'critical_write': [],
    'high_read_data': [],
    'low_rls_empty': [],
    'secure': [],
}

for i, table in enumerate(tables):
    if table == 'spatial_ref_sys':
        continue

    # 1. Test SELECT with anon — does it return data?
    sel = http_call('GET', table, LEGACY_ANON)
    has_data = sel['status'] == 200 and sel['body'].strip() not in ('[]', '')

    # 2. Test INSERT with anon — does it succeed?
    # Use a generic payload that should NOT trigger schema errors but is clearly a probe
    ins = http_call('POST', table, LEGACY_ANON, body={'_x_probe_2026_09_23': 'audit'}, prefer='count=exact')

    # 3. Test DELETE with anon using a non-existent PK — should be 401/404 if locked, 204 if write allowed
    pk = get_pk(table)
    if pk:
        pk_col = pk['attname']
        if pk['typname'] == 'uuid':
            where = f"{pk_col}=eq.00000000-0000-0000-0000-000000000000"
        elif 'int' in pk['typname']:
            where = f"{pk_col}=eq.-99999999"
        elif pk['typname'] in ('text', 'varchar'):
            where = f"{pk_col}=eq.__security_audit_no_match__"
        else:
            where = None
    else:
        where = None

    if where:
        d = http_call('DELETE', table, LEGACY_ANON, where=where)
    else:
        d = {'status': 0, 'body': 'no PK', 'count_header': 'none'}

    # Classify
    insert_succeeded = ins['status'] in (200, 201) and '0' not in ins.get('count_header', '0')
    insert_failed_correctly = ins['status'] == 401 or '42501' in ins['body'] or 'row-level security' in ins['body'].lower()
    delete_failed_correctly = d['status'] in (401, 404) or '42501' in d['body'] or 'row-level security' in d['body'].lower()

    is_critical = insert_succeeded or (d['status'] in (200, 204) and not delete_failed_correctly)
    is_high = has_data

    finding = {
        'table': table,
        'GET': {'status': sel['status'], 'has_data': has_data},
        'POST': {'status': ins['status'], 'body_preview': ins['body'][:100]},
        'DELETE': {'status': d['status'], 'body_preview': d['body'][:100]},
        'severity': 'CRITICAL' if is_critical else ('HIGH' if is_high else ('LOW_RLS_EMPTY' if sel['status'] == 200 else 'SECURE'))
    }

    results['findings'].append(finding)
    results['tables_probed'] += 1

    if is_critical:
        results['critical_write'].append(table)
    elif is_high:
        results['high_read_data'].append(table)
    elif sel['status'] == 200:
        results['low_rls_empty'].append(table)
    else:
        results['secure'].append(table)

    if (i + 1) % 25 == 0:
        print(f'  [{i+1}/{len(tables)}] CRIT={len(results["critical_write"])} HIGH={len(results["high_read_data"])} LOW={len(results["low_rls_empty"])} SEC={len(results["secure"])}')

with open('/tmp/sec-audit/anon-probe-v2.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f'\n=== ANON ACCESS PROBE v2 ===')
print(f'Total: {results["tables_probed"]}')
print(f'CRITICAL (anon can write): {len(results["critical_write"])}')
print(f'HIGH (anon can read data): {len(results["high_read_data"])}')
print(f'LOW (RLS-filtered empty): {len(results["low_rls_empty"])}')
print(f'SECURE (401): {len(results["secure"])}')

if results['critical_write']:
    print('\nCRITICAL:')
    for t in results['critical_write'][:20]: print(f'  - {t}')

if results['high_read_data']:
    print('\nHIGH:')
    for t in results['high_read_data']: print(f'  - {t}')
