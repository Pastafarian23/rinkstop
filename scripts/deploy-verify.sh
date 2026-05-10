#!/bin/bash
# deploy-verify.sh — Quick post-deploy verification
# Usage: SITE_URL=https://rinkstop.com SUPABASE_URL=... API_SECRET=... node scripts/deploy-verify.js

echo "RinkStop Blog — Post-Deploy Verification"
echo ""

# Check API_SECRET is set
if [ -z "$API_SECRET" ]; then
  echo "⚠️  API_SECRET not set!"
  echo "   Add it to your Vercel environment variables:"
  echo "   Vercel Dashboard → Project → Settings → Environment Variables"
  echo "   Key: API_SECRET, Value: <your-secret>"
fi

# Check SUPABASE_URL
if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
  echo "⚠️  SUPABASE_URL not configured!"
  echo "   Set it to your Supabase project URL"
fi

# Run the verification
node scripts/deploy-verify.js