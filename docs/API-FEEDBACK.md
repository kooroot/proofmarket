# ProofMarket — TxLINE / txoracle API Feedback

Produced as the Phase-0 exit artifact, confirmed against the shipped E2E replay and the
frozen golden bundle (`fixtureId=18172280 seq=1068 statKey=1 epochDay=20634`). Offered back
as a gist/PR.

1. **`validate_stat` is a bool-oracle, NOT assert-or-revert.** Both TRUE and FALSE predicates SUCCEED
   (~205k CU each) and surface the result only via `get_return_data()`: `AQ==`(0x01)=true / `AA==`(0x00)=false,
   plus the inner log `Predicate evaluated to: true|false`. Consumers MUST read return data — tx success ≠ outcome.
   The published docs ship no CPI/`get_return_data` consumer example; we reconstructed the discriminator +
   return-decode pattern empirically. Ours (this repo's `resolve`) supplies a worked example.
2. **Tampered / wrong-seq proofs:** an earlier-seq-but-valid proof or a byte-tampered proof returns FALSE / errors
   inside the CPI — caught by rebuilding predicate+stat from on-chain `Market` storage (never trusting the caller).
3. **Measured byte/CU budget (a real constraint, not just a note):** the single-stat golden bundle is small
   (the frozen golden proof tx = **878 B**, safe; `ProofNode` = 33 B each), but the **worst-case** proof tx
   (statProof=6 / subTree=13 / mainTree=7) = **1307 B, which EXCEEDS the 1232 B transaction limit** and does NOT
   fit — there is no chunking escape (all proofs must ride in one `validate_stat` call). So a consumer MUST pin to
   low-event fixtures (`statProof + subTree + mainTree ≤ 23 nodes`) or the settlement tx is unsendable. CU is not
   the bottleneck: inner `validate_stat` ≈ **205,264** (wrapper ≈ 210,769), well under the 1.4M budget. The API
   would benefit from documenting this node-count ceiling explicitly.
4. **Two IDLs disagree (a silent-failure trap):** the shipped standalone `idl/txoracle.json` is **v1.4.7** and
   MISSES `"returns": "bool"` on `validate_stat`; only the **v1.5.2** IDL (referenced in `documentation/…/devnet.mdx`)
   declares it. A client generated from the stale v1.4.7 IDL silently fails to decode the return value — the call
   appears to succeed but `returnData` is never surfaced. Generate clients from the v1.5.2 mdx IDL; we vendored and
   patched `idls/txoracle.json` to v1.5.2 to fix this.
5. **PDA / epochDay hazard:** daily-root seeds `["daily_scores_roots", epochDay u16 LE]`, `epochDay = ts/86_400_000`.
   Docs ambiguously source `ts` (`summary.updateStats.minTimestamp` vs top-level `ts`); they coincide for epochDay
   20634 (`BcLwqH…`) but can **straddle a UTC midnight** on other fixtures → wrong PDA → 404. Pin one `ts` source.
6. **No FT / last-seq attestation:** the feed exposes no on-chain proof that a chosen `seq` is the FINAL one for a
   fixture (163+ distinct seqs were live for our fixture), motivating a trustless finality binding — we gate v1 via
   a named-keeper + wall-clock `resolve_after_ts` rather than trusting an unattested "latest" seq.
