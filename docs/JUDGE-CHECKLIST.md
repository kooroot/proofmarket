# Judge-Testability Checklist (spec §5.5)

Each item maps to the automated gate that verifies it. Run all hermetic gates at once with
`bash scripts/judge-check.sh` (or `npm run judge-check`); add `CHECK_DEPLOY=1` to also assert the
**live devnet surface** via `scripts/check-deploy.ts`. The devnet program + pinned mint + seeded
demo market are **deployed and verified** as of 2026-07-01 — see [`DEPLOY-LOG.md`](./DEPLOY-LOG.md).
The only items still open require the **hosted frontend** (Vercel), whose on-chain prerequisites are
now all in place; they are intentionally NOT asserted by the offline hermetic gate so it stays green.

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
| Separate sandbox market resolves against copied root (never live-devnet resolve) | `npm run e2e-replay` (bankrun sandbox clones the daily-root) | ✅ hermetic |
| Program + pinned test-USDC mint deployed on devnet at `declare_id` | `check-deploy.ts` (`CHECK_DEPLOY=1`) | ✅ **LIVE** |
| Pre-seeded demo market on devnet (golden 60 YES / 40 NO, 3 positions, 100 USDC escrow) | `check-deploy.ts` (`CHECK_DEPLOY=1`) | ✅ **LIVE** (OPEN) |
| Pre-seeded **Resolved** market + permanent resolve tx | — | ⚪ by-design hermetic — live resolve impossible against the historical golden proof; receipt via `e2e-replay` |
| Test-USDC faucet mints 1000 to any pubkey | mint LIVE (`check-deploy.ts`); faucet endpoint in `web/` | 🟡 mint LIVE; faucet UI needs frontend deploy |
| Server-side free SL1 data (judge needs no devnet SOL to SEE data) | `web/` server route + `TXLINE_API_TOKEN` | 🟡 needs frontend deploy |
| Deployed devnet URL: faucet → stake → Proof Receipt + Explorer permalinks | Vercel deploy (`DEPLOY.md` Step 5) | 🟡 on-chain surface LIVE; needs frontend deploy |

**Bottom line:** every hermetic claim is reproducible offline today (`bash scripts/judge-check.sh` = submission GO),
and the **live devnet surface is deployed + verified** (`CHECK_DEPLOY=1 npm run judge-check`; full record in
`DEPLOY-LOG.md`). The remaining 🟡 items are the hosted-frontend surface only — their on-chain prerequisites
(program, pinned mint, seeded market) are all live; standing up the Vercel URL (`DEPLOY.md` Step 5, needs your
Vercel account + server-only `TXLINE_API_TOKEN`/`KEEPER_KEYPAIR`) turns them green. A live **Resolved** market
(⚪) is not achievable with the historical golden proof by design — the Resolved Proof Receipt is produced by the
hermetic sandbox resolve.
