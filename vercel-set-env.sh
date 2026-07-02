#!/bin/bash
# Set 8 new STRIPE_PRICE_* env vars on Vercel via the Vercel API.
set -euo pipefail

CREDS=/root/.openclaw/credentials/vercel.json
TOKEN=$(jq -r .token "$CREDS")
PROJECT_ID=$(jq -r .projectId "$CREDS")
TEAM_ID=$(jq -r .teamId "$CREDS")
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: no token in $CREDS" >&2
  exit 1
fi

echo "=== Reading existing env vars (looking for prior versions of the 8 new keys) ==="
EXISTING=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID")

echo ""
echo "=== Setting 8 new env vars ==="

while IFS='|' read -r prod_id price_id name; do
  # Skip blank lines
  [ -z "$name" ] && continue
  case "$name" in
    "RinkStop Verified Identity") env_name="STRIPE_PRICE_VERIFIED_IDENTITY" ;;
    "RinkStop Identity Plus") env_name="STRIPE_PRICE_IDENTITY_PLUS" ;;
    "RinkStop Club Starter") env_name="STRIPE_PRICE_CLUB_STARTER" ;;
    "RinkStop Club Pro") env_name="STRIPE_PRICE_CLUB_PRO" ;;
    "RinkStop Club Elite") env_name="STRIPE_PRICE_CLUB_ELITE" ;;
    "RinkStop League") env_name="STRIPE_PRICE_LEAGUE" ;;
    "RinkStop Business Listing") env_name="STRIPE_PRICE_BUSINESS_LISTING" ;;
    "RinkStop Business Plus") env_name="STRIPE_PRICE_BUSINESS_PLUS" ;;
    *) echo "WARN: no env mapping for '$name', skipping"; continue ;;
  esac

  # Check if env var already exists
  existing_id=$(echo "$EXISTING" | jq -r --arg k "$env_name" '.envs[]? | select(.key == $k) | .id' | head -1)

  if [ -n "$existing_id" ] && [ "$existing_id" != "null" ]; then
    echo "--- updating $env_name = $price_id ---"
    resp=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $TOKEN" \
      -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$existing_id?teamId=$TEAM_ID" \
      -H "Content-Type: application/json" \
      -d "{\"value\":\"$price_id\"}")
    status=$(echo "$resp" | grep HTTP_STATUS | cut -d: -f2)
    body=$(echo "$resp" | sed '/HTTP_STATUS/d')
    if [ "$status" = "200" ]; then
      new_val=$(echo "$body" | jq -r .value)
      echo "    OK $env_name = $new_val"
    else
      echo "    ERROR $status: $body"
    fi
  else
    echo "--- creating $env_name = $price_id ---"
    resp=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $TOKEN" \
      -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
      -H "Content-Type: application/json" \
      -d "{\"key\":\"$env_name\",\"value\":\"$price_id\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}")
    status=$(echo "$resp" | grep HTTP_STATUS | cut -d: -f2)
    body=$(echo "$resp" | sed '/HTTP_STATUS/d')
    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
      new_val=$(echo "$body" | jq -r .value)
      echo "    OK $env_name = $new_val"
    else
      echo "    ERROR $status: $body"
    fi
  fi
done < /tmp/stripe-new-products.txt

echo ""
echo "=== Verification: all STRIPE_PRICE_* env vars on Vercel ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  | jq -r '.envs[]? | select(.key | startswith("STRIPE_PRICE_")) | "\(.key) = \(.value)"' \
  | sort
