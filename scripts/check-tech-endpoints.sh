#!/usr/bin/env bash
set -euo pipefail
F="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/docs/TECH-ENDPOINTS.md"
need=( "/auth/guest/start" "subscribe(serviceLevelId=1" "/api/token/activate" \
       "/api/fixtures/snapshot" "/api/scores/stream" "/api/scores/stat-validation" \
       "daily_scores_roots" "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J" \
       "[107,197,232,90,191,136,105,185]" "validate_stat" "AQ==" )
for s in "${need[@]}"; do
  grep -qF -- "$s" "$F" || { echo "MISSING endpoint/CPI: $s"; exit 1; }
done
echo "TECH-ENDPOINTS OK: 4-step auth + stat-validation + SSE + daily_scores_roots PDA + txoracle CPI all documented"
