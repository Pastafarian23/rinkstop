#!/usr/bin/env bash
# How many builds has today cost, and should this push wait?
#
# 2026-11-11 (Arnel): build time is too expensive on the Vercel invoice.
# Every push triggers a ~148s build that re-prerenders 461 static pages.
# The dominant cost is PUSH FREQUENCY, not build fatness.
#
# This script is the pre-flight check before every push:
#   - how many builds today
#   - how many commits are waiting on a deploy right now (the backlog)
#   - a clear verdict: PUSH NOW or BATCH
#
# Usage: ./scripts/_build-batch-rule.sh
# Exit: 0 = fine to push, 1 = batch it (informational, not a hard block)

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

VERCEL_TOKEN="${VERCEL_TOKEN:-$(python3 -c "
import json,os
p=os.path.expanduser('~/.openclaw/credentials/vercel.json')
try: print(json.load(open(p)).get('token',''))
except Exception: print('')
" 2>/dev/null || echo '')}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_GVvqDaSS264FFo6q8LYAKGVe0bvM}"

echo "=== BUILD BATCH CHECK ==="

# 1. How many commits are waiting to deploy?
BACKLOG=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l)
echo "  commits waiting on a deploy: $BACKLOG"

# 2. How many builds today?
if [ -n "$VERCEL_TOKEN" ]; then
  TODAY=$(python3 - <<PY
import json,os,urllib.request,datetime
tok=os.environ.get('VERCEL_TOKEN','')
pid=os.environ.get('VERCEL_PROJECT_ID','')
try:
    req=urllib.request.Request(
        f"https://api.vercel.com/v6/deployments?projectId={pid}&limit=30",
        headers={"Authorization": f"Bearer {tok}"})
    d=json.load(urllib.request.urlopen(req, timeout=20))
    today=datetime.datetime.now(datetime.timezone.utc).date()
    n=0; mins=0.0
    for dep in d.get('deployments', []):
        b=dep.get('buildingAt'); r=dep.get('ready')
        if not b or not r: continue
        if datetime.datetime.fromtimestamp(b/1000, datetime.timezone.utc).date()==today:
            n+=1; mins+=(r-b)/1000/60
    print(f"{n} {mins:.1f}")
except Exception as e:
    print(f"? ?")
PY
)
  set -- $TODAY
  BUILDS=${1:-?} ; BMIN=${2:-?}
  echo "  builds today:              $BUILDS  (${BMIN} min)"
else
  BUILDS=? ; BMIN=?
  echo "  builds today:              (unknown — no Vercel token)"
fi

echo ""
if [ "$BACKLOG" -gt 1 ]; then
  echo "  VERDICT: BATCH"
  echo "  $BACKLOG commits are already queued for a build. Push them together"
  echo "  instead of adding another. Each extra push costs another full build."
  exit 1
fi
if [ "$BUILDS" != "?" ] && [ "$BUILDS" -ge 6 ]; then
  echo "  VERDICT: BATCH"
  echo "  $BUILDS builds already today. Land the remaining work, then push once."
  exit 1
fi
echo "  VERDICT: PUSH NOW"
exit 0
