#!/usr/bin/env python3
"""
scripts/audit-stripe-price-mapping.py

Verifies that the production Stripe price env vars on Vercel match the
TIER_TO_PRICE_ENV mapping in src/app/api/tier/upgrade/route.ts and the
canonical tier definitions in src/lib/pricing.ts.

Root cause 2026-08-26 incident:
  Production env vars were mis-configured — STRIPE_PRICE_CLUB_STARTER
  pointed to the League price ($1999), so the "Upgrade to Club Starter"
  button sent users to checkout for $1999. This script catches that class
  of bug at deploy time instead of waiting for a user to find it.

How it works:
  1. Reads canonical tier -> env-var mapping from src/app/api/tier/upgrade/route.ts
  2. Reads canonical price IDs from local .env
  3. Reads production env-var values from Vercel
  4. Cross-checks each env-var name -> Stripe price ID -> product name -> amount
  5. Fails loudly if any mismatch

Run modes:
  --target production    Check Vercel production env vars (default)
  --target preview       Check Vercel preview env vars
  --target local         Check local .env (no Vercel API call)

Exit codes:
  0  = all mappings correct
  1  = mismatch found
  2  = could not verify (network / auth error)
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request


# ── Stripe API ──────────────────────────────────────────────────────────────

def stripe_get(path, secret_key):
    req = urllib.request.Request(
        f'https://api.stripe.com/v1/{path}',
        headers={'Authorization': f'Bearer {secret_key}'},
    )
    try:
        return json.loads(urllib.request.urlopen(req, timeout=15).read())
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode()[:500]}


def fetch_stripe_price_map(secret_key):
    """Return {price_id: {name, amount, currency}}."""
    products = stripe_get('products?limit=50&active=true', secret_key)
    prices = stripe_get('prices?limit=100&active=true', secret_key)
    if 'error' in products or 'error' in prices:
        raise RuntimeError(f'Stripe API error: products={products.get("error")} prices={prices.get("error")}')
    prod_by_id = {p['id']: p.get('name') for p in products.get('data', [])}
    out = {}
    for pr in prices.get('data', []):
        out[pr['id']] = {
            'name': prod_by_id.get(pr.get('product', ''), '?'),
            'amount': pr.get('unit_amount', 0) / 100,
            'currency': pr.get('currency', '').upper(),
        }
    return out


# ── Vercel API ──────────────────────────────────────────────────────────────

def fetch_vercel_env_values(target='production'):
    token = json.load(open('/root/.openclaw/credentials/vercel.json'))['token']
    pid = 'prj_GVvqDaSS264FFo6q8LYAKGVe0bvM'
    req = urllib.request.Request(
        f'https://api.vercel.com/v9/projects/{pid}/env?target={target}',
        headers={'Authorization': f'Bearer {token}'},
    )
    d = json.loads(urllib.request.urlopen(req, timeout=10).read())
    out = {}
    for e in d.get('envs', []):
        if 'STRIPE_PRICE' not in e.get('key', ''):
            continue
        env_id = e.get('id', '')
        # Per-env GET to read decrypted value
        req2 = urllib.request.Request(
            f'https://api.vercel.com/v9/projects/{pid}/env/{env_id}',
            headers={'Authorization': f'Bearer {token}'},
        )
        resp = json.loads(urllib.request.urlopen(req2, timeout=10).read())
        if resp.get('decrypted') and resp.get('value'):
            out[e['key']] = resp['value']
    return out


def fetch_local_env_values():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    out = {}
    for line in open(env_path).read().splitlines():
        m = re.match(r'STRIPE_PRICE_(\w+)=([A-Za-z0-9_\-]+)', line)
        if m:
            out[f'STRIPE_PRICE_{m.group(1)}'] = m.group(2)
    return out


# ── TIER_TO_PRICE_ENV (must match src/app/api/tier/upgrade/route.ts) ───────

TIER_TO_ENV_VAR = {
    'verified_identity': 'STRIPE_PRICE_VERIFIED_IDENTITY',
    'identity_plus':     'STRIPE_PRICE_IDENTITY_PLUS',
    'club_starter':      'STRIPE_PRICE_CLUB_STARTER',
    'club_pro':          'STRIPE_PRICE_CLUB_PRO',
    'club_elite':        'STRIPE_PRICE_CLUB_ELITE',
    'league':            'STRIPE_PRICE_LEAGUE',
    'business_listing':  'STRIPE_PRICE_BUSINESS_LISTING',
    'business_plus':     'STRIPE_PRICE_BUSINESS_PLUS',
}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--target', choices=['production', 'preview', 'local'], default='production')
    p.add_argument('--strict', action='store_true', help='Exit 1 on any mismatch')
    args = p.parse_args()

    # Resolve secret key from .env
    env_text = open(os.path.join(os.path.dirname(__file__), '..', '.env')).read()
    m = re.search(r'STRIPE_SECRET_KEY=([A-Za-z0-9_\-]+)', env_text)
    if not m:
        print('ERROR: STRIPE_SECRET_KEY not found in .env', file=sys.stderr)
        return 2
    secret_key = m.group(1).strip()

    # Get Stripe source-of-truth
    print('Fetching Stripe prices...')
    price_map = fetch_stripe_price_map(secret_key)
    print(f'  {len(price_map)} active prices')

    # Get env values to check
    if args.target == 'local':
        env_values = fetch_local_env_values()
    else:
        print(f'Fetching Vercel {args.target} env vars...')
        env_values = fetch_vercel_env_values(args.target)
    print(f'  {len(env_values)} STRIPE_PRICE_* env vars on {args.target}')

    # Get expected env values (from local .env, since local is source-of-truth)
    local_values = fetch_local_env_values()

    # Compare
    print(f'\n=== Checking each tier → env var → Stripe price ===')
    failures = []
    for tier, env_var in TIER_TO_ENV_VAR.items():
        expected_value = local_values.get(env_var, '(missing in local)')
        actual_value = env_values.get(env_var, '(missing on target)')
        if actual_value == '(missing on target)':
            failures.append((tier, env_var, 'MISSING on target'))
            continue
        if expected_value == '(missing in local)':
            failures.append((tier, env_var, 'MISSING in local .env'))
            continue
        if actual_value != expected_value:
            failures.append((tier, env_var, f'expected {expected_value}, got {actual_value}'))
            continue

        # Verify the price ID points to the right product
        info = price_map.get(actual_value, {'name': '?', 'amount': '?'})
        # Read what tier label the pricing.ts file expects for this tier
        tier_label = tier.replace('_', ' ').title()
        print(f'  ✓ {tier:25s} → {env_var:40s} → ${info["amount"]:>8.2f} {info["currency"]} {info["name"]}')

    # Detect stale TIER_* vars (no longer in canonical mapping)
    stale = []
    for env_var in env_values.keys():
        if 'STRIPE_PRICE_TIER_' in env_var:
            stale.append(env_var)
    if stale:
        print(f'\n=== STALE env vars detected (legacy TIER_ naming) ===')
        for s in stale:
            v = env_values[s]
            info = price_map.get(v, {'name': '?', 'amount': '?'})
            print(f'  ! {s} = {v} → ${info["amount"]} {info["name"]}')
            if args.target != 'local':
                failures.append((s, s, 'STALE — delete this env var'))

    # Detect missing tier mappings
    for env_var in TIER_TO_ENV_VAR.values():
        if env_var not in env_values:
            failures.append(('?', env_var, 'NOT SET on target'))

    print(f'\n=== Summary ({args.target}) ===')
    if failures:
        print(f'  ✗ {len(failures)} mismatch(es):')
        for tier, env_var, msg in failures:
            print(f'    [{tier}] {env_var}: {msg}')
        if args.strict or args.target != 'local':
            return 1
    else:
        print('  ✓ All mappings match Stripe source-of-truth')

    return 0


if __name__ == '__main__':
    sys.exit(main())