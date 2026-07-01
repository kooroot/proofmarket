# Judge-Testability Checklist (spec §5.5)

Each item maps to the automated gate that verifies it. Run all hermetic gates at once with
`bash scripts/judge-check.sh` (or `npm run judge-check`). Items marked **PENDING P4.8** require the
funding-gated devnet deploy (`keys/devnet-deployer.json` ≥ 2 SOL) and are verified by `scripts/check-deploy.ts`
once deployed — they are intentionally NOT asserted by the hermetic gate so the offline submission gate stays green.

| §5.5 item | Verified by | Status |
|-----------|-------------|--------|
| Public repo (MIT) + README one-command setup + pinned toolchain | `check-repo-hygiene.sh` | ✅ hermetic |
| ≤5-min demo video script on replayed data | `check-demo-script.sh` | ✅ hermetic |
| Tech doc — exact endpoints + `validate_stat` CPI | `check-tech-endpoints.sh` | ✅ hermetic |
| API-feedback note (bool-oracle, IDL trap, byte/CU budget) | `check-api-feedback.sh` | ✅ hermetic |
| Proof Receipt renders from persisted state (byte-equality: on-chain roots == frontend bundle) | `cd web && npm test` (`ProofChain.integrity.test.tsx`) | ✅ hermetic |
| "Verify it yourself" on the receipt (re-run `validate_stat` → `AQ==`) | `cd web && npm test` (`ProofChain.test.tsx` — `AQ==` step) | ✅ hermetic |
| UMA/betmoar contrast panel + "N seconds, 0 disputes, 0 voters" | `cd web && npm test` | ✅ hermetic |
| Hermetic E2E: create → stake ×3 → resolve (`validate_stat` CPI into local ABI-compatible fixture) → claim, on replayed data | `npm run e2e-replay` (bankrun) | ✅ hermetic |
| `close_market` rent-reclaim + fee-sweep (400_000 residual) | `tests/close_market.ts` (bankrun) | ✅ hermetic |
| Server-side free SL1 data (judge needs no devnet SOL to SEE data) | `check-deploy.ts` | ⏳ PENDING P4.8 |
| Test-USDC faucet mints 1000 to any pubkey | `check-deploy.ts` | ⏳ PENDING P4.8 |
| Pre-seeded Resolved market (receipt from persisted state + permanent resolve tx) | `check-deploy.ts` | ⏳ PENDING P4.8 |
| Separate sandbox market resolves against copied root (never live-devnet resolve) | `check-deploy.ts` | ⏳ PENDING P4.8 |
| Deployed devnet URL: faucet → stake (sandbox) → watch resolve + Proof Receipt + Explorer permalinks | `check-deploy.ts` | ⏳ PENDING P4.8 |

**Bottom line:** every judge-testable claim except the live-devnet surface is reproducible offline today. The
hermetic gate (`bash scripts/judge-check.sh`) is the submission GO for everything not behind the funding gate;
the five PENDING items go green the moment P4.8 deploys.
