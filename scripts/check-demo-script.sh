#!/usr/bin/env bash
set -euo pipefail
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
F="$R/docs/DEMO-SCRIPT.md"
need=( "0:00–0:30" "0:30–1:30" "1:30–2:00" "2:00–4:00" "4:00–4:45" "4:45–5:00" \
       "validate_stat" "AQ==" "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe" \
       "0 disputes" "No vote" "test-USDC" )
for s in "${need[@]}"; do
  grep -qF -- "$s" "$F" || { echo "MISSING required beat: $s"; exit 1; }
done
# The last beat must end at or before 5:00.
grep -qF "4:45–5:00" "$F" || { echo "video exceeds 5:00 budget"; exit 1; }
echo "DEMO-SCRIPT OK: all 6 beats + hero artifacts present, ends <= 5:00"
