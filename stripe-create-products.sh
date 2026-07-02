#!/bin/bash
# Create 8 new Stripe products + annual prices for the 2026-07-02 pricing brief.
# Federation is contact-sales only — no Stripe product.
# Reads API key from /root/.openclaw/credentials/stripe.json
set -euo pipefail

CREDS=/root/.openclaw/credentials/stripe.json
STRIPE_KEY=$(jq -r .api_key "$CREDS")
if [ -z "$STRIPE_KEY" ] || [ "$STRIPE_KEY" = "null" ]; then
  echo "ERROR: no api_key in $CREDS" >&2
  exit 1
fi

auth="Authorization: Bearer $STRIPE_KEY"

# Helper: create product + annual price. Returns the new price id.
# Args: $1=name, $2=description, $3=price_usd_cents
create_product() {
  local name="$1" desc="$2" cents="$3"
  echo "--- creating product: $name (\$$(awk -v c="$cents" 'BEGIN{printf "%.2f", c/100}') / yr) ---"
  local prod
  prod=$(curl -s -H "$auth" -X POST https://api.stripe.com/v1/products \
    -d "name=$name" \
    -d "description=$desc")
  local prod_id
  prod_id=$(echo "$prod" | jq -r .id)
  if [ -z "$prod_id" ] || [ "$prod_id" = "null" ]; then
    echo "  ERROR: $prod" >&2
    return 1
  fi
  echo "  product: $prod_id"

  local price
  price=$(curl -s -H "$auth" -X POST https://api.stripe.com/v1/prices \
    -d "product=$prod_id" \
    -d "unit_amount=$cents" \
    -d "currency=usd" \
    -d "recurring[interval]=year")
  local price_id
  price_id=$(echo "$price" | jq -r .id)
  if [ -z "$price_id" ] || [ "$price_id" = "null" ]; then
    echo "  ERROR: $price" >&2
    return 1
  fi
  echo "  price:   $price_id"
  echo "$prod_id|$price_id|$name"
}

# Output is captured into /tmp/stripe-new-products.txt for the next step.
# Only data lines (product_id|price_id|name) are written, not status messages.
exec 3>/tmp/stripe-new-products.txt
> /tmp/stripe-new-products.txt

create_product "RinkStop Verified Identity" \
  "Required for active participation in the RinkStop ecosystem. Identity verification, claim your player profile, unlimited roles under one identity." \
  2499 >&3

create_product "RinkStop Identity Plus" \
  "Everything in Verified Identity plus Family Hub, advanced analytics, unlimited photos/videos, priority support." \
  5999 >&3

create_product "RinkStop Club Starter" \
  "Designed for small clubs. Up to 30 players, team management, registration, scheduling, attendance, payments." \
  14900 >&3

create_product "RinkStop Club Pro" \
  "Mid-sized clubs. Up to 150 players, multiple teams, coach management, financial reporting." \
  39900 >&3

create_product "RinkStop Club Elite" \
  "Large clubs. Unlimited teams, advanced analytics, custom branding, API access, multi-location." \
  99900 >&3

create_product "RinkStop League" \
  "League-wide management. Custom pricing based on scope, dedicated success manager." \
  199900 >&3

create_product "RinkStop Business Listing" \
  "Verified business listing with contact, lead form, photos, analytics." \
  9900 >&3

create_product "RinkStop Business Plus" \
  "Multi-listing, featured placement, promotions, messaging, enhanced analytics, booking support." \
  29900 >&3

exec 3>&-

echo ""
echo "=== All products created ==="
cat /tmp/stripe-new-products.txt
