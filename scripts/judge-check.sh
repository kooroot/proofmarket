#!/usr/bin/env bash
# Final judge-testability gate — aggregates every HERMETIC §5.5 gate into one GO/NO-GO.
# Prereqs (run once): yarn install && make build && (cd web && npm install)
# The devnet-deploy items (§5.5 live surface) are funding-gated (P4.8) and intentionally
# NOT asserted here; see docs/JUDGE-CHECKLIST.md.
set -uo pipefail
R="/Users/kooroot/Desktop/dev/prediction-bot/proofmarket"
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
gate "hermetic E2E replay (bankrun)"   e2e.log       bash -c "cd '$R' && yarn e2e-replay"

printf '\n== devnet deploy GO ==\n'
echo "  ⏳ SKIPPED — P4.8 funding-gated (scripts/check-deploy.ts pending; see docs/JUDGE-CHECKLIST.md)"

printf '\n'
if [ "$fail" -eq 0 ]; then
  echo "JUDGE-CHECK: ALL HERMETIC GATES GREEN (deploy gate pending P4.8) — submission gate PASS"
  exit 0
else
  echo "JUDGE-CHECK: NO-GO — one or more hermetic gates FAILED (see ✗ above)"
  exit 1
fi
