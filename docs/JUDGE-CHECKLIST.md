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
| Test-USDC faucet mints 1000 to any pubkey | `POST https://proofmarket-tan.vercel.app/api/faucet/usdc` | ✅ **LIVE** (verified 2026-07-02: mint sig `33747afM…`, 1000 USDC + 0.01 SOL grant to a fresh wallet) |
| Server-side free SL1 data (judge needs no devnet SOL to SEE data) | `/api/txline/{proof,scores,odds}/…` on the deployed URL | ✅ **LIVE** (all three proxies 200 against golden fixture 18172280; SL1 apiToken activated on-chain 2026-07-02) |
| Deployed devnet URL: faucet → stake → Proof Receipt + Explorer permalinks | **https://proofmarket-tan.vercel.app** (Vercel production; team-scoped alias is SSO-walled — use this URL) | ✅ **LIVE** |

**Bottom line:** every hermetic claim is reproducible offline today (`bash scripts/judge-check.sh` = submission GO),
the **live devnet surface is deployed + verified** (`CHECK_DEPLOY=1 npm run judge-check`; full record in
`DEPLOY-LOG.md`), and the **hosted frontend is live at https://proofmarket-tan.vercel.app** (faucet mint,
SL1 data proxies, and the market UI all verified end-to-end on 2026-07-02 — see the DEPLOY-LOG update section).
The only non-green row, a live **Resolved** market (⚪), is not achievable with the historical golden proof by
design — the Resolved Proof Receipt is produced by the hermetic sandbox resolve.
