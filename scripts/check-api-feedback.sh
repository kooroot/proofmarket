#!/usr/bin/env bash
set -euo pipefail
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
F="$R/docs/API-FEEDBACK.md"
need=( "bool-oracle" "AQ==" "AA==" "get_return_data" "1232" "v1.4.7" "v1.5.2" \
       "epochDay" "midnight" "last-seq" "FT" )
for s in "${need[@]}"; do
  grep -qF -- "$s" "$F" || { echo "MISSING feedback point: $s"; exit 1; }
done
echo "API-FEEDBACK OK: bool-oracle + tampered-proof + byte/CU budget + IDL trap + epochDay hazard + FT attestation gap"
