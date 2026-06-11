#!/usr/bin/env python3
"""
Fix og_image_url on the LONG-SLUG post records (the ones actually used in URLs).
The page code at src/app/blog/[slug]/page.tsx looks up posts by the long slug
(the full title slug), not the short one. Our earlier patch hit the short slugs.
"""
import load_secrets
import json, os
import urllib.request

sb = json.load(open('/root/.openclaw/credentials/supabase.json'))
key = sb['serviceRoleKey']
base = os.environ['NEXT_PUBLIC_SUPABASE_URL'] + '/rest/v1'

# Long slugs that are actually used in the blog URLs
long_slugs = {
    'adult-hockey-leagues-near-me-a-player-s-guide-to-finding-local-programs':
        'https://rinkstop.com/images/adult-hockey-leagues-near-me.jpg',
    'ice-rink-directory-usa-a-complete-guide-to-finding-every-rink-in-any-state':
        'https://rinkstop.com/images/ice-rink-directory-usa-a-complete-guide-to-finding-every-rink-in-any-state.jpg',
    'hockey-training-facilities-near-me-a-complete-guide-to-finding-local-skill-devel':
        'https://rinkstop.com/images/hockey-training-facilities-near-me-a-complete-guide-to-finding-local-skill-devel.jpg',
    'public-ice-skating-near-you-a-complete-guide-to-open-skate-sessions-in-any-city':
        'https://rinkstop.com/images/public-ice-skating-near-you-a-complete-guide-to-open-skate-sessions-in-any-city.jpg',
    'hockey-rinks-with-pro-shops-a-complete-guide-to-one-stop-hockey-facilities':
        'https://rinkstop.com/images/hockey-rinks-with-pro-shops-a-complete-guide-to-one-stop-hockey-facilities.jpg',
    'hockey-practice-facilities-by-state-how-to-find-ice-time-and-training-space-anyw':
        'https://rinkstop.com/images/hockey-practice-facilities-by-state-how-to-find-ice-time-and-training-space-anyw.jpg',
    'ice-rink-near-me-how-to-find-local-rinks-for-hockey-skating-and-recreation':
        'https://rinkstop.com/images/ice-rink-near-me-how-to-find-local-rinks-for-hockey-skating-and-recreation.jpg',
    'youth-hockey-leagues-near-me-a-complete-guide-to-finding-local-programs':
        'https://rinkstop.com/images/youth-hockey-leagues-near-me.jpg',
    'hockey-teams-near-me-a-complete-guide-to-finding-local-teams-and-leagues':
        'https://rinkstop.com/images/hockey-teams-near-me.jpg',
}

updated = 0
failed = 0
for slug, image_url in long_slugs.items():
    # First, look up the actual slug in the DB (it might be slightly different)
    lookup_url = f'{base}/posts?slug=ilike.{slug}&select=id,slug,og_image_url'
    req = urllib.request.Request(lookup_url, headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    try:
        rows = json.loads(urllib.request.urlopen(req, timeout=10).read())
    except Exception as e:
        print(f'  ✗ {slug[:50]}... lookup failed: {e}')
        failed += 1
        continue

    if not rows:
        print(f'  ✗ {slug[:50]}... no DB row found')
        failed += 1
        continue

    row = rows[0]
    actual_slug = row['slug']
    if row.get('og_image_url') == image_url:
        print(f'  ✓ {actual_slug[:50]}... already correct')
        continue

    # PATCH the actual DB slug with the new og_image_url
    patch_url = f'{base}/posts?slug=eq.{actual_slug}'
    body = json.dumps({'og_image_url': image_url}).encode()
    patch_req = urllib.request.Request(
        patch_url,
        data=body,
        method='PATCH',
        headers={
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Prefer': 'return=representation',
        }
    )
    try:
        result = json.loads(urllib.request.urlopen(patch_req, timeout=10).read())
        if result and len(result) > 0:
            print(f'  ✓ {actual_slug[:55]}... -> {image_url[-50:]}')
            updated += 1
        else:
            print(f'  ? {actual_slug[:55]}... patched but empty result')
    except Exception as e:
        print(f'  ✗ {actual_slug[:55]}... PATCH failed: {e}')
        failed += 1

print()
print(f'Updated: {updated} | Failed: {failed}')
