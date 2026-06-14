#!/bin/bash
# Create 9 test accounts in Clerk (one per account_type) for Phase 4 testing.
# Each test user gets a unique email + Clerk ID, then we'll create profiles
# in Supabase with the right account_type.

set -e
CLERK_SECRET=$(cat /root/.openclaw/credentials/clerk.json | python3 -c "import sys,json;print(json.load(sys.stdin)['secret_key'])")
SUPABASE_PAT=$(cat /root/.openclaw/credentials/supabase.json | python3 -c "import sys,json;print(json.load(sys.stdin)['pat'])")
SUPABASE_URL=$(cat /root/.openclaw/credentials/supabase.json | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])")
SUPABASE_SERVICE=$(cat /root/.openclaw/credentials/supabase.json | python3 -c "import sys,json;print(json.load(sys.stdin)['serviceRoleKey'])")
PROJ=yszheonqyyskkjoxoexk

TYPES=(player parent coach scout referee rink_operator league_admin team_admin business fan)
TIERS=(free supporter verified free supporter verified free verified pro free)

echo "Creating test accounts..."
echo ""
ACCOUNTS_FILE=/tmp/phase4-test-accounts.json
echo "[]" > "$ACCOUNTS_FILE"

for i in "${!TYPES[@]}"; do
  TYPE="${TYPES[$i]}"
  TIER="${TIERS[$i]}"
  EMAIL="kiloclaw+phase4-${TYPE}@rinkstop.com"
  PASSWORD="RinkStopPhase4!2026"

  # Create in Clerk (instance requires phone_number + verified).
  # Use a unique real US-format 11-digit number per account to avoid dup detection.
  # Twilio's public test numbers are: +15005550006, +15005550007, etc.
  # But we need 9 unique ones. Use 12025550XXX (DC area code) with XXX varying.
  PHONE_NUM="+1202555$(printf "%04d" $((1000+i)))"
  RESP=$(curl -s -X POST "https://api.clerk.com/v1/users" \
    -H "Authorization: Bearer $CLERK_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"email_address\":[\"$EMAIL\"],\"phone_number\":[\"$PHONE_NUM\"],\"password\":\"$PASSWORD\",\"first_name\":\"Phase4\",\"last_name\":\"$TYPE\",\"skip_password_checks\":true,\"skip_phone_number_verification\":true}")

  USER_ID=$(echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('id',''))" 2>/dev/null)

  if [ -z "$USER_ID" ]; then
    echo "  $TYPE: FAILED - $RESP"
    continue
  fi

  # Create profile in Supabase (or update if exists)
  python3 <<PYEOF
import json, subprocess
acc = json.load(open("$ACCOUNTS_FILE"))
acc.append({"type":"$TYPE","tier":"$TIER","user_id":"$USER_ID","email":"$EMAIL","password":"$PASSWORD"})
json.dump(acc, open("$ACCOUNTS_FILE","w"))
PYEOF

  # Wait for Clerk webhook to create profile (or insert directly)
  sleep 1
  SQL="INSERT INTO public.profiles (user_id, role, tier, display_name, is_founding_member) VALUES ('$USER_ID', 'user', '$TIER', 'Phase4 $TYPE', false) ON CONFLICT (user_id) DO UPDATE SET tier=EXCLUDED.tier, display_name=EXCLUDED.display_name;"
  python3 -c "import json,sys;print(json.dumps({'query': sys.argv[1]}))" "$SQL" > /tmp/q.json
  curl -s "https://api.supabase.com/v1/projects/$PROJ/database/query" \
    -H "Authorization: Bearer $SUPABASE_PAT" -H "Content-Type: application/json" \
    --data @/tmp/q.json > /dev/null

  # Add account_type (multi-type table)
  SQL="INSERT INTO public.profile_account_types (user_id, account_type, is_primary) VALUES ('$USER_ID', '$TYPE', true) ON CONFLICT (user_id, account_type) DO NOTHING;"
  python3 -c "import json,sys;print(json.dumps({'query': sys.argv[1]}))" "$SQL" > /tmp/q.json
  curl -s "https://api.supabase.com/v1/projects/$PROJ/database/query" \
    -H "Authorization: Bearer $SUPABASE_PAT" -H "Content-Type: application/json" \
    --data @/tmp/q.json > /dev/null

  echo "  $TYPE ($TIER): $USER_ID"
done

echo ""
echo "=== Summary ==="
python3 -c "
import json
acc = json.load(open('$ACCOUNTS_FILE'))
print(f'Created {len(acc)} accounts')
for a in acc:
    print(f\"  {a['type']:15s} {a['tier']:10s} {a['user_id']}\")
"
echo ""
echo "Saved to: $ACCOUNTS_FILE"
