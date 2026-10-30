#!/usr/bin/env python3
"""Run a SQL query against Supabase via the Management API and print results."""
import json, sys, http.client

CREDS = '/root/.openclaw/credentials/supabase.json'
PROJECT = 'yszheonqyyskkjoxoexk'

with open(CREDS) as f:
    creds = json.load(f)

if len(sys.argv) < 2:
    print("Usage: query-supabase.py <path-to-sql>")
    sys.exit(1)

with open(sys.argv[1]) as f:
    sql = f.read()

conn = http.client.HTTPSConnection('api.supabase.com', timeout=60)
body = json.dumps({"query": sql})
conn.request('POST', f'/v1/projects/{PROJECT}/database/query', body, {
    'Authorization': f'Bearer {creds["pat"]}',
    'Content-Type': 'application/json',
})
resp = conn.getresponse()
text = resp.read().decode()
print('Status:', resp.status)
if resp.status >= 400:
    print('ERROR:', text[:3000])
    sys.exit(1)
try:
    print(json.dumps(json.loads(text), indent=2)[:6000])
except Exception:
    print(text[:6000])
