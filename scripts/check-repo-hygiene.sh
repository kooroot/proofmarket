#!/usr/bin/env bash
set -euo pipefail
R="/Users/kooroot/Desktop/dev/prediction-bot/proofmarket"
grep -qF "MIT" "$R/LICENSE" || { echo "LICENSE missing/empty"; exit 1; }
need=( "yarn e2e-replay" "0.31.1" "0.30.1" "Environment variables" \
       "TXLINE_API_TOKEN" "NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID" "NEXT_PUBLIC_USDC_MINT" \
       "faucet" "no devnet SOL" )
for s in "${need[@]}"; do
  grep -qiF -- "$s" "$R/README.md" || { echo "README missing: $s"; exit 1; }
done
echo "REPO-HYGIENE OK: MIT license + one-command setup + pinned toolchain + documented env vars"
