#!/bin/bash
# Smart deploy script for RinkStop
# Runs build first, only deploys if build passes. No more mystery failures.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

DEPLOY_TOKEN="${1:-}"
MAX_RETRIES=3
RETRY_DELAY=15

if [ -z "$DEPLOY_TOKEN" ]; then
  echo "❌ Usage: ./scripts/smart-deploy.sh <vercel-token> [--skip-build]"
  echo "   Or set VERCEL_TOKEN env var"
  exit 1
fi

cd "$PROJECT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Step 1/3 — Building locally..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build > /tmp/rinkstop-build.log 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo "❌ Build FAILED — not deploying."
  echo ""
  echo "Build errors:"
  tail -30 /tmp/rinkstop-build.log
  echo ""
  echo "Fix errors, then re-run this script."
  exit 1
fi

echo "✅ Build passed!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Step 2/3 — Deploying to Vercel..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

deploy_with_retry() {
  local attempt=1
  while [ $attempt -le $MAX_RETRIES ]; do
    echo "📦 Deploy attempt $attempt of $MAX_RETRIES..."
    
    DEPLOY_OUTPUT=$(vercel --prod --token "$DEPLOY_TOKEN" --yes 2>&1)
    DEPLOY_EXIT=$?
    
    if [ $DEPLOY_EXIT -eq 0 ]; then
      echo "$DEPLOY_OUTPUT"
      return 0
    fi
    
    # Check for retryable errors
    if echo "$DEPLOY_OUTPUT" | grep -qi "read timed out\|connection reset\|network error\|429\|502\|503\|504"; then
      echo "⚠️  Transient error (attempt $attempt) — retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
      attempt=$((attempt + 1))
    else
      echo "❌ Non-retryable error:"
      echo "$DEPLOY_OUTPUT"
      return 1
    fi
  done
  
  echo "❌ Max retries exceeded — not deploying."
  return 1
}

deploy_with_retry
DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -ne 0 ]; then
  echo ""
  echo "⚠️  Deploy failed after retries."
  echo "The built files are still valid — re-run this script to retry."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 3/3 — Verifying deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Quick smoke test - check key URLs respond
sleep 3

VERIFY_URLS=(
  "https://rinkstop.com/"
  "https://rinkstop.com/directory"
  "https://rinkstop.com/api/leagues?slug=nhl"
)

for url in "${VERIFY_URLS[@]}"; do
  HTTP_CODE=$(curl -sI --max-time 10 "$url" 2>/dev/null | grep -i "^HTTP" | awk '{print $2}' | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $url → $HTTP_CODE"
  else
    echo "⚠️  $url → $HTTP_CODE (may need a moment to propagate)"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"