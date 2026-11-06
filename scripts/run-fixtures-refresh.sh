#!/bin/bash
# run-fixtures-refresh.sh
#
# Daily fixtures refresh for RinkStop. 2026-11-06 (Arnel data-integrity audit).
#
# Why this wrapper exists:
#   The daily-scores orchestrator (`_daily-scores-all-leagues.cjs`) had NO
#   cron. It was only ever run by hand. That meant:
#     - the HockeyTech fallback added to it (the only working source for
#       QMJHL / OHL / WHL / AHL / USHL now that Highlightly is dead) would
#       never have run automatically
#     - no league's fixtures were being refreshed on any schedule
#     - the freshness audit result file was a day stale, so staleness was
#       invisible
#
#   This wrapper is designed to be a cron `command` payload:
#     exit 0 = healthy, exit non-zero = failure (the cron failure-alert path
#     fires, no model call, no main-session wake).
#
# Steps:
#   1. Run the unified daily-scores orchestrator (NHL.com + Highlightly +
#      HockeyTech fallback).
#   2. Run the HockeyTech ingest for the Canadian junior leagues. The
#      orchestrator only calls HockeyTech when Highlightly produced nothing
#      for a league, so this direct run guarantees the junior schedules stay
#      populated even if Highlightly comes back with partial coverage.
#   3. Run the freshness audit and fail if any league that HAS fixtures is
#      stale or in a gap.
#
# The HockeyTech feed rate limits at roughly one call per 25-30s per key, so
# the ingest takes several minutes. It is run detached and polled.

set -u

SCRIPT_DIR="/root/.openclaw/workspace/rinkstop-platform"
LOG_DIR="/root/.openclaw/workspace/logs"
LOG_FILE="$LOG_DIR/fixtures-refresh.log"
PID_FILE="/tmp/fixtures-refresh.pid"
RUN_ID="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$LOG_DIR"

# --- Reuse an in-flight run ------------------------------------------------
if [ -f "$PID_FILE" ]; then
  EXISTING="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING" ] && kill -0 "$EXISTING" 2>/dev/null; then
    echo "Already running (PID $EXISTING) — nothing to do."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR"

echo "=== Fixtures refresh started: $(date -Is) ===" >>"$LOG_FILE"

# --- 1. Unified daily scores orchestrator (detached) ----------------------
bash scripts/run-daily-scores-all-leagues.sh >>"$LOG_FILE" 2>&1

# --- 2. HockeyTech ingest for the Canadian junior leagues (detached) ------
# The HockeyTech feed is the ONLY working source for these now that
# Highlightly is dead. Without this the schedules go stale again.
# PER-RUN LOG: each run gets its own file. A shared cumulative log makes
# the error check below count errors from PREVIOUS runs — so one bad
# historical run would fail every future run forever, even after the
# underlying bug was fixed. That is a gate that can never go green.
HT_LOG="$LOG_DIR/hockeytech-ingest-$RUN_ID.log"
setsid nohup bash -c "set -a; source .env; set +a; node scripts/_ingest-hockeytech-schedules.mjs" \
  </dev/null >>"$HT_LOG" 2>&1 &
HT_PID=$!
disown "$HT_PID" 2>/dev/null || true
echo "$HT_PID" > "$PID_FILE"
echo "HockeyTech ingest started in background (PID $HT_PID)" >>"$LOG_FILE"

# Poll for up to 25 minutes (the feed rate limit makes a full 5-league run
# take ~20 min).
for _ in $(seq 1 150); do
  if ! kill -0 "$HT_PID" 2>/dev/null; then
    break
  fi
  sleep 10
done

if kill -0 "$HT_PID" 2>/dev/null; then
  echo "WARNING: HockeyTech ingest still running after 25 min — not failing the run." >>"$LOG_FILE"
else
  rm -f "$PID_FILE"
  # Fail loudly if the ingest hit upsert errors.
  HT_ERRORS="$(grep -c 'upsert error' "$HT_LOG" 2>/dev/null || true)"
  HT_ERRORS="${HT_ERRORS:-0}"
  if [ "$HT_ERRORS" -gt 0 ]; then
    echo "FAIL: HockeyTech ingest reported $HT_ERRORS upsert errors — see $HT_LOG" >&2
    exit 1
  fi
  echo "HockeyTech ingest completed with 0 upsert errors." >>"$LOG_FILE"
fi

# Keep per-run ingest logs from accumulating forever.
find "$LOG_DIR" -maxdepth 1 -name 'hockeytech-ingest-*.log' -mtime +14 -delete 2>/dev/null || true

# --- 3. Freshness audit ----------------------------------------------------
node scripts/_freshness-audit.cjs >>"$LOG_FILE" 2>&1

RESULT="/tmp/freshness-audit-result.json"
if [ ! -f "$RESULT" ]; then
  echo "FAIL: freshness audit produced no result file" >&2
  exit 1
fi

# Fail if any league that actually has fixtures is stale or in a gap.
# Leagues with ZERO fixtures are not a failure — there are 298 leagues in the
# table and most have never had data (that is a coverage question, not a
# pipeline failure).
#
# NOTE: the audit emits UPPERCASE statuses ('OK', 'STALE', 'GAP', 'empty').
# The comparison is case-normalised on purpose — a lowercase comparison
# silently matches nothing and this gate would never fail.
# Leagues whose only upstream source is currently unavailable. The
# Highlightly subscription is dead (HTTP 403 "not subscribed") and
# HockeyTech does not cover these (verified live 2026-11-06: del, shl, khl,
# vhl, liiga, mhl all return "Client access denied" with every available
# key). Their fixtures cannot be refreshed until the subscription is
# restored, so they are reported but do NOT fail the cron — otherwise this
# job pages Arnel every morning about a problem he already has in hand and
# cannot fix without resubscribing on RapidAPI.
#
# ECHL and NCAA D1 are also included: HockeyTech returns "Invalid key" for
# echl and "Client access denied" for ncaa (verified live 2026-11-06), so
# neither has any working source. The remaining gaps are a handful of past
# games (ECHL 7, NCAA D1 7) with no result recorded.
#
# Remove a league from this list as soon as a working source exists for it.
BLOCKED_LEAGUES="Finnish Liiga|Kontinental Hockey League|Swedish Hockey League|VHL|ECHL|NCAA Division 1 Men's Hockey"

STALE_COUNT="$(python3 -c "
import json, re
blocked = set(filter(None, re.split(r'\|', '''$BLOCKED_LEAGUES''')))
d=json.load(open('$RESULT'))
bad=[l for l in d['leagues']
     if str(l.get('status','')).upper() in ('STALE','GAP')
     and l.get('total',0)>0
     and l['name'] not in blocked]
print(len(bad))
")"

echo "Leagues with fixtures that are stale or in a gap: $STALE_COUNT" >>"$LOG_FILE"

if [ "$STALE_COUNT" -gt 0 ]; then
  python3 -c "
import json
d=json.load(open('$RESULT'))
for l in d['leagues']:
    if str(l.get('status','')).upper() in ('STALE','GAP') and l.get('total',0)>0:
        print('  -', l['name'], '|', l['status'], '| total=', l['total'], '| last=', l.get('last_updated'))
" >&2
  echo "FAIL: $STALE_COUNT league(s) with fixtures are stale or in a gap — see $LOG_FILE" >&2
  exit 1
fi

# Report (not fail) leagues that are blocked on an unavailable upstream source.
python3 -c "
import json, re
blocked = set(filter(None, re.split(r'\|', '''$BLOCKED_LEAGUES''')))
d=json.load(open('$RESULT'))
rows=[l for l in d['leagues']
      if str(l.get('status','')).upper() in ('STALE','GAP')
      and l.get('total',0)>0
      and l['name'] in blocked]
if rows:
    print('BLOCKED (upstream source unavailable — needs Highlightly resubscribe):', file=__import__('sys').stderr)
    for l in rows:
        print(f\"  - {l['name']} | {l['status']} | total={l['total']} | last={str(l.get('last_updated'))[:10]}\", file=__import__('sys').stderr)
" >&2

echo "=== Fixtures refresh OK: $(date -Is) ===" >>"$LOG_FILE"
exit 0
