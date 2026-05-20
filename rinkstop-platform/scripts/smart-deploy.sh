#!/bin/bash
# Smart deploy with env-based token
# Usage: VERCEL_TOKEN=xxx ./smart-deploy.sh

set -e

TOKEN="${VERCEL_TOKEN:-${1:-}}"
MAX_RETRIES=3
RETRY_DELAY=15

if [ -z "$TOKEN" ]; then
  echo "❌ No token. Set VERCEL_TOKEN env var or pass as argument."
  exit 1
fi

cd "$(dirname "$0")"

echo "🔨 Running local build..."
npm run build > /tmp/rinkstop-build.log 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed:"
  tail -20 /tmp/rinkstop-build.log
  exit 1
fi
echo "✅ Build passed"

echo "🚀 Deploying..."
ATTEMPT=1
while [ $ATTEMPT -le $MAX_RETRIES ]; do
  OUTPUT=$(vercel --prod --token "$TOKEN" --yes 2>&1)
  EXIT=$?
  if [ $EXIT -eq 0 ]; then
    echo "$OUTPUT"
    echo ""
    echo "✅ Deployed!"
    sleep 3
    for url in "https://rinkstop.com/" "https://rinkstop.com/directory" "https://rinkstop.com/api/leagues?slug=nhl"; do
      CODE=$(curl -sI --max-time 8 "$url" 2>/dev/null | grep -i "^HTTP" | awk '{print $2}' | tail -1)
      echo "$CODE ← $url"
    done
    exit 0
  fi
  if echo "$OUTPUT" | grep -qi "timed out\|reset\|429\|502\|503\|network"; then
    echo "⚠️  Attempt $ATTEMPT failed (transient). Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    ATTEMPT=$((ATTEMPT + 1))
  else
    echo "❌ Deploy failed:"
    echo "$OUTPUT"
    exit 1
  fi
done
echo "❌ Max retries exceeded."