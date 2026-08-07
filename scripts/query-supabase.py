#!/usr/bin/env python3
"""Run a SQL query against Supabase and print results."""
import json, sys, http.client

with open('.env') as f:
    creds = json.load(f)

PAT = creds['pat']
PROJECT = 'yszheonqyyskkjoxoexk'

if len(sys.argv) < 2:
    print("Usage: query-supabase.py <path-to-sql>")
    sys.exit(1)

with open(sys.argv[1]) as f:
    sql = f.read()

conn = http.client.HTTPSConnection('api.supabase.com', timeout=30)
body = json.dumps({"query": sql})
conn.request('POST', f'/v1/projects/{PROJECT}/database/query', body, {
    'Authorization': f'Bearer {PAT}',
    'Content-Type': 'application/json',
})
resp = conn.getresponse()
print(f'Status: {resp.status}')
text = resp.read().decode()
if resp.status >= 400:
    print('ERROR:', text[:1500])
    sys.exit(1)
print(text[:3000])
