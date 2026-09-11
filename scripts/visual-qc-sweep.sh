#!/usr/bin/env bash
# Visual QC sweep across representative URLs.
# Bg is #0D1117 (dark theme). Forbidden text colors:
#   #041E42 #1a1a1a #222 #444 #555 #666 #777 #888 #999 #AAA #BBB #A0A0A0
# Allowed on dark: rgba(255,255,255,X) and #C8102E and #fff.
set -uo pipefail

URLS=(
  "/"
  "/learn"
  "/learn/hockey-rules"
  "/learn/hockey-terminology"
  "/directory"
  "/directory/ahl"
  "/directory/khl"
  "/directory/leagues"
  "/directory/pro-leagues"
  "/directory/college/nchc"
  "/directory/college/big-ten"
  "/directory/junior/whl"
  "/directory/international/olympics"
  "/directory/youth-hockey"
  "/directory/rinks/alain-ice-rink-hili-fun-city"
  "/directory/rinks/iceinline-alexandra"
  "/directory/rinks/edge-ice-arena-littleton"
  "/directory/teams/boston-bruins"
  "/directory/players/macklin-celebrini"
  "/directory/countries"
  "/directory/countries/finland"
  "/directory/united-states"
  "/directory/united-states/new-york"
  "/directory/united-states/new-york/new-york"
  "/directory/united-states/illinois/chicago"
  "/gear-brands"
  "/federations/finland"
  "/federations/sweden"
  "/federations/canada"
  "/news"
  "/news/nhl"
  "/news/nhl/boston-bruins"
  "/news/nhl/boston-bruins/some-article-slug"
  "/guides/hockey-rules"
  "/glossary"
  "/about"
  "/contact"
  "/editorial-policy"
  "/faq"
)

TOTAL_HITS=0
RESULTS=()

for url in "${URLS[@]}"; do
  HTML=$(curl -sL --max-time 20 "https://rinkstop.com${url}" 2>/dev/null)
  CODE=$?
  [ $CODE -ne 0 ] && continue
  STATUS=$(curl -sLo /dev/null -w "%{http_code}" --max-time 20 "https://rinkstop.com${url}" 2>/dev/null)
  if [ "$STATUS" != "200" ]; then
    RESULTS+=("$STATUS  $url")
    continue
  fi
  # Grep all color: patterns and flag forbidden hex.
  HITS=$(echo "$HTML" | grep -oE 'color:#[0-9A-Fa-f]+|color:rgba\([^)]+\)' | sort | uniq -c | sort -rn | awk '$2 ~ /^color:(#041E42|#1a1a1a|#222|#444|#555|#666|#777|#888|#999|#AAA|#A0A0A0|#FFD700|#FFD800)/ {c+=$1} END {print c+0}')
  if [ "$HITS" -gt 0 ]; then
    # Check if the URL is in the false-positive whitelist (semantic intentional hex)
    case "$url" in
      /directory/international/olympics)  RESULTS+=("$HITS  $url  ⚠ semantic-gold") ;;
      /directory/players/*)               RESULTS+=("$HITS  $url  ⚠ semantic-pill") ;;
      /contact)                           RESULTS+=("$HITS  $url  ⚠ semantic-option") ;;
      *)                                  RESULTS+=("$HITS  $url  ❌") ; TOTAL_HITS=$((TOTAL_HITS + HITS)) ;;
    esac
  else
    RESULTS+=("OK   $url")
  fi
done

echo "=== Visual QC sweep — $(date -u +%H:%M:%S) UTC ==="
for r in "${RESULTS[@]}"; do
  echo "$r"
done
echo "---"
echo "Total URLs: ${#URLS[@]}  Hits: $TOTAL_HITS"
