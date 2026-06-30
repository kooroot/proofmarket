# Pre-Flight Plan Review — Findings & Resolutions

Conflict scan of `docs/IMPLEMENTATION-PLAN.md` (84 tasks) run before execution, per
superpowers:subagent-driven-development. 8 findings; none required a human decision
(each is the plan's own Cross-Phase Interface Contract overriding a stale task body,
a verified bug, or a sequencing/Appendix note).

| # | Severity | Issue | Resolution | Status |
|---|----------|-------|-----------|--------|
| **F1** | BLOCKER | P0.3 & P1.1 both run `anchor init proofmarket` → scaffold collision | P0.3 owns the scaffold; P1.1 Step 1 → precondition check (verify `Anchor.toml` exists) | ✅ **applied** to plan |
| **F2** | BLOCKER | `MONOTONE_CUMULATIVE_KEYS` Rust `[u32;3]=[1,2,3]` vs off-chain `[1..8]` → markets with keys 4–8 revert `UnsupportedPredicate(6105)` | Expand Rust to `[u32;8]=[1..8]` (verified: keys 1–8 = goals/yellows/reds/corners, all monotone-cumulative, per P2.6 line). Const array, not in account state → no `INIT_SPACE` ripple. | ✅ **applied** to plan |
| **F3** | BLOCKER | P1.7 `CreateMarket.mint` has `#[account(address = USDC_MINT)]` vs Contract "mint-agnostic" | Remove the address pin (Contract wins); mint recorded into `Market.mint`, enforced per-market by stake/claim/resolve | ✅ **applied** to plan |
| **F8** | MINOR | P2.1 `@solana/web3.js@^1.95.4` vs Global Constraints `^1.98.4` | Bump to `^1.98.4` | ✅ **applied** to plan |
| **F2-verify** | — | (which side of F2 is correct) | Verified against plan P2.6: keys 1/2 goals, 3/4 yellows, 5/6 reds, 7/8 corners — all cumulative ⇒ TS `[1..8]` is correct, Rust was incomplete | ✅ resolved |
| **F7** | IMPORTANT (rubric) | P1.S2 `close_market` test body is a comment-only stub (0 assertions) | **Appendix A.5 already supplies the real `close_market.ts` test** — use A.5, not the P1.S2 stub | ⏳ **at P1**: execute A.5's test in place of the P1.S2 stub |
| **F4** | BLOCKER | P4.2 inline code uses 4 pre-Contract broken refs (`mapBundleToResolveArgs`, `scripts/lib/pdas`, raw-pubkey `feeDestination`, missing `vault:`) | Delete the P4.2 inline block; implement P4.2 as on-chain assertions wrapping `runEndToEnd()` from A.3 (Contract-compliant) | ⏳ **at P4** |
| **F5** | IMPORTANT | P4.3/P4.4 import non-existent `app/lib/receipt.ts` + `ProofReceipt` | Use `buildReceipt` from `offchain/src/keeper/receipt.ts` (P2.16) + `ProofChain` from `web/src/components/ProofChain.tsx` | ⏳ **at P4** |
| **F6** | IMPORTANT | P4.2 needs `dailyRootPda` from A.3, but A.3 runs after P4.2 | Run **A.3 Step 1** (4-line add of `dailyRootPda` to `tests/helpers.ts`) as a prerequisite immediately before P4.2 | ⏳ **at P4** |

**Applied edits** live in `docs/IMPLEMENTATION-PLAN.md` (F1/F2/F3/F8). The deferred items (F4/F5/F6 at Phase 4, F7 at Phase 1) are tracked here and in `.git/sdd/progress.md` so they survive context compaction and are resolved at their task boundary.
