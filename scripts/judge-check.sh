#!/usr/bin/env bash
# Final judge-testability gate — aggregates every HERMETIC §5.5 gate into one GO/NO-GO.
# Prereqs (run once): yarn install && make build && (cd web && npm install)
#   — or with bun:    bun install  && make build && (cd web && bun install)
# The devnet-deploy items (§5.5 live surface) are funding-gated (P4.8) and intentionally
# NOT asserted here; see docs/JUDGE-CHECKLIST.md.
set -uo pipefail
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGD="${TMPDIR:-/tmp}/proofmarket-judge-check"
mkdir -p "$LOGD"
fail=0

# gate <label> <logfile> <cmd...>  — runs cmd, redirecting output to the log; prints ✓/✗.
gate() {
  local label="$1" log="$LOGD/$2"; shift 2
  printf '\n== %s ==\n' "$label"
  if "$@" >"$log" 2>&1; then
    local pass; pass="$(grep -Eo '[0-9]+ passing' "$log" | tail -1)"
    echo "  ✓ PASS${pass:+ ($pass)}"
  else
    echo "  ✗ FAIL — see $log"; tail -20 "$log"; fail=1
  fi
}

gate "repo hygiene"                    hygiene.log   "$R/scripts/check-repo-hygiene.sh"
gate "demo script"                     demo.log      "$R/scripts/check-demo-script.sh"
gate "tech endpoints"                  tech.log      "$R/scripts/check-tech-endpoints.sh"
gate "api feedback"                    api.log       "$R/scripts/check-api-feedback.sh"
gate "frontend Proof-Receipt (vitest)" web.log       bash -c "cd '$R/web' && npm test"
gate "hermetic E2E replay (bankrun)"   e2e.log       bash -c "cd '$R' && npm run e2e-replay"

printf '\n== devnet deploy GO ==\n'
if [ "${CHECK_DEPLOY:-0}" = "1" ]; then
  if (cd "$R" && ANCHOR_PROVIDER_URL="${ANCHOR_PROVIDER_URL:-https://api.devnet.solana.com}" \
        npx ts-node --transpile-only scripts/check-deploy.ts) >"$LOGD/deploy.log" 2>&1; then
    echo "  ✓ PASS (live devnet surface verified — scripts/check-deploy.ts)"
  else
    echo "  ✗ FAIL — see $LOGD/deploy.log"; tail -15 "$LOGD/deploy.log"; fail=1
  fi
else
  echo "  ⏳ SKIPPED — set CHECK_DEPLOY=1 to verify the live deploy (scripts/check-deploy.ts); hermetic gate stays green offline"
fi

printf '\n'
if [ "$fail" -eq 0 ]; then
  if [ "${CHECK_DEPLOY:-0}" = "1" ]; then
    echo "JUDGE-CHECK: ALL GATES GREEN (devnet deploy is LIVE) — submission gate PASS"
  else
    echo "JUDGE-CHECK: ALL GATES GREEN (hermetic only; set CHECK_DEPLOY=1 to include live devnet) — submission gate PASS"
  fi
  exit 0
else
  echo "JUDGE-CHECK: NO-GO — one or more hermetic gates FAILED (see ✗ above)"
  exit 1
fi
