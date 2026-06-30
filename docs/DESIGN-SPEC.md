# ProofMarket — Track 1 Design Spec

*Solana DEVNET parimutuel prediction market for the FIFA World Cup, settled by cryptographic Merkle proofs via TxLINE `validate_stat`.*

> **Status:** Design **APPROVED 2026-06-30**; all 12 Open-Question defaults accepted (locked below). Proceeding to implementation planning (writing-plans).
> **Target:** TxODDS World Cup Hackathon — Track 1 (Prediction Markets & Settlement, $18K; 1st=$12k). Deadline 2026-07-19 23:59 UTC. Solo builder, ~19 days.
> **Provenance:** Produced by a 25-agent workflow (4 sections x [design -> 3-lens adversarial review (correctness/feasibility/hackathon) -> refine -> verify] -> synthesis). Every technical claim is grounded in `TxLINE/TECH-REFERENCE.md`, `TxLINE/HACKATHON-BRIEF.md`, and the `tx-on-chain` `devnet.mdx` (v1.5.2). Items not empirically verified are labeled **UNVERIFIED** and gated behind a Phase-0 spike.

## Overview

ProofMarket is a parimutuel sports prediction market on Solana where **every market is a TxLINE `validate_stat` predicate**, collateralized in a devnet test-USDC, and resolved with **no human voting and no dispute window** — settlement is a single on-chain CPI into TxLINE's `validate_stat`, gated on a self-authenticating Merkle proof. The hero surface is a **"Proof Receipt"** that visualizes the full cryptographic resolution chain (stat leaf -> eventStatRoot -> fixture subtree -> daily root PDA -> `validate_stat` TRUE -> escrow release), explicitly contrasted with Polymarket/UMA's optimistic-oracle commit/reveal voting + dispute (as surfaced by the reference app betmoar.fun). **Tagline: "No vote. No dispute window. Just math."**

## Decisions Locked (2026-06-30 — Open-Question defaults accepted)

The 12 Open Questions (full text at the end of this doc) are resolved to their recommended defaults. These are the concrete inputs the implementation plan builds on; any can still be revised before the relevant freeze.

**Build / IDL-freezing:**
1. **Resolver authority** — ship `resolve` with a `resolver: Pubkey` field; **named-keeper gate for v1** (resolver signer + `resolve_after_ts`), **flip to permissionless once Gate G2 confirms forged-proof revert**. Gate-only change; struct unaffected.
2. **Plan-B** — Day-4 trigger confirmed; if G0/G1 are red by Day 4, branch to the **receipt-only / narrated** fallback (keeper lands `validate_stat` top-level + off-chain escrow). Fallback accepted.
3. **Payout distribution** — **pull-`claim`** (per-winner), not auto-distribute.
4. **Anchor pin** — **0.31.1 + matching Agave**; documented fallback to 0.30.1 if it won't build by EOD Day 1; pin client `@coral-xyz/anchor` + IDL to the **deployed** build, not `package.json`.
5. **Predicate class v1** — **GreaterThan + monotone-cumulative keys only** (goals `1/2`, corners `7/8`, cards — exact allowlist confirmed in G3); broaden to LessThan/EqualTo/two-stat only post-G3.
6. **`resolve_after_ts` margin** — **kickoff + 150 min** (covers stoppage + ET + penalties); revisit an on-chain sanity bound after G3/G4.

**Policy / scope (defaults in-spec):**
7. **Replay anchor** — pursue **P0-g: capture a real `Confirmed:true` finished-friendly bundle** as the demo; seq-1068 mid-ET1 is the honest floor.
8. **Void** — **permissionless timeout refund** (`void_timeout` + `refund`) for v1; proof-backed void is cut.
9. **Forfeiture** — **vault stays claimable indefinitely**; `close_market` reclaims only fee + dust; **never** sweep winner principal to the creator.
10. **Hero fidelity** — **single-stat marquee** (byte-faithful to the verified `{1,1,7}` bundle); corners-style two-stat shown as predicate text only.
11. **Period scope** — **full-match markets only** until Phase-0 confirms `ScoreStat.period` semantics per statKey/phase.
12. **TIER-1** — **single-stat-only v1 floor**; TIER-1a (totals/corners/cards via `Add`) and TIER-1b (1X2/handicap via `Subtract`) are post-Phase-0 stretch, gated on P0-d/P0-e.

---

## Section 1 — Architecture & Identity

**Locked decisions:** (1) Track 1 (judging: Core Functionality, UX & Use Case, Code Quality & Logic). (2) Settlement = **our own** Anchor USDC-escrow program that CPIs `txoracle::validate_stat` and reads its `bool` via `sol_get_return_data` — **not** the shipped `settle_trade`/`create_trade` lifecycle (which re-introduces a TxODDS authority co-sign + illustrative `/api/trading` dependency). (3) **Parimutuel** multi-user pools: stake YES/NO in USDC, one `validate_stat` CPI resolves the market, the winning pool is split pro-rata minus fee. (4) **"Proof Receipt"** hero, positioned against UMA voting.

**Three layers / trust split:**

- **Ingestion Core** — shared across all tracks; already working in the spike. Guest JWT -> on-chain `subscribe` (SL1 free tier) -> activate token -> SSE/snapshot + scores/odds decode + proof-bundle fetch.
- **On-chain program** — the **only** trust surface that moves funds. Parimutuel pools + `validate_stat` CPI settlement.
- **Off-chain** (Market Gen, Keeper Resolver, Frontend) — untrusted by construction: proofs are self-authenticating, so a malicious keeper cannot mis-settle (a forged proof reverts inside `validate_stat`).

**TxLINE-native flourish:** show TxLINE live odds as a "fair-value baseline" beside the parimutuel implied probability — exploiting the odds feed, not just scores. *(UNVERIFIED odds decode — gated on Phase-0.)*

---


## Section 2 — On-Chain Program

> **Trust surface.** This is the *only* component that holds or moves user funds. Market Gen, Keeper, and Frontend are all untrusted: settlement is gated on a self-authenticating Merkle proof verified inside `txoracle::validate_stat`. A malicious keeper cannot pick the YES/NO outcome out of thin air; a forged proof reverts inside `validate_stat` **(this revert behavior is asserted-but-unproven — see Gate G2)**.
>
> **Sources & their epistemic weight.** IDL ground truth = `/tmp/txonchain/documentation/programs/devnet.mdx` v1.5.2 (line refs, *authoritative*). Empirical behavior = `step1-spike/validate-sim.log` — **this is a top-level `connection.simulateTransaction` (`validate-sim.ts:103`) encoded with the *stale* v1.4.2 `idl/txoracle.json` (`:21`, pre-`returns:bool`), NOT a landed CPI.** Facts = `TECH-REFERENCE.md` (§). `proofmarket` below is *our* NEW Anchor program, independent of `txoracle`.

---

### 2.0 The one architectural fact that dictates `resolve()` — and exactly what is proven vs. unproven

`validate_stat` is **NOT assert-or-revert.** A TRUE predicate and a FALSE predicate both return `success`, consume ~205,264 CU, and write the answer to **program return data** — `AQ==` (`0x01`) for true, `AA==` (`0x00`) for false (`validate-sim.log:30-31,44`). The IDL confirms `"returns": "bool"` (devnet.mdx:1611). The old `validate-sim.ts` hypothesis (TRUE→success / FALSE→`PredicateFailed 6021`) is **falsified by its own log** — `6021` lives in the shipped `settle_trade` path, not `validate_stat`.

**Consequence (load-bearing):** `resolve()` must invoke `validate_stat` and then read the bool out-of-band. We can **never** use tx-revert to encode YES/NO.

**What `validate-sim.log` actually proves (do not overclaim):** a *top-level, simulated* `validate_stat` returns `AQ==`/`AA==` and succeeds either way. **What it does NOT prove (the genuine net-new risk):**
1. that a custom Anchor program *builds and deploys at all* on this machine (toolchain absent — TECH-REFERENCE §10);
2. that `get_return_data()` yields those bytes when `validate_stat` is the **callee of a CPI** rather than the top-level program;
3. that a *landed* (non-simulated) tx behaves identically.

The brief's hero requirement is literally "your smart contracts CPI into `validate_stat`" (HACKATHON-BRIEF L31), so **this exact unproven link is the deliverable.** It is gated below, not assumed.

---

### 2.0.1 Phase-0 go/no-go gates — build nothing downstream of a red gate

| Gate | Day | Pass criterion | If it fails |
|---|---|---|---|
| **G0 Toolchain** | 1 | `solana` CLI + `cargo-build-sbf` installed; `anchor` matching pinned **0.31.1** (local avm is 0.30.1 — TECH-REFERENCE §10); `anchor init` + hello-world **lands on devnet**. | Stop. No Track-1 entry without a working build (HACKATHON-BRIEF L12). Trigger Plan B (below) by **Day 4**. |
| **G1 CPI return** | 2 | Throwaway 1-ix program does *only* `invoke(validate_stat)` + read bool; **lands on devnet** returning `[1]`/`[0]`. Try `declare_program!` `cpi::validate_stat → Return<bool>.get()` FIRST; fall back to raw `invoke` + `get_return_data()`. | Stop. This is the whole thesis. Re-scope before Day 5. |
| **G2 Forged-proof revert** | 2 | Flip one byte in `stat_to_prove.value`, then one `ProofNode.hash`; confirm `validate_stat` **reverts (Custom error)**, NOT `success`+`AA==`. | If a bad proof returns `false` instead of reverting, permissionless `resolve` is unsafe → require a trusted resolver signer until fixed. |
| **G3 Finality/seq** | 2–3 | Fetch ≥2 leaves for one fixture across seqs; determine whether `(key, period=FT)` is **latest-wins / unique-terminal** in the daily tree, and whether **post-full-time batches still carry the score leaf**. Resolve the `period:7` meaning (spike saw `value=1, period=7, key=1`, log:14-15) vs the `(period*1000)+base` scheme (TECH-REFERENCE §6a). | Bind `seq`/terminal-leaf explicitly in `resolve` (below). Until resolved, ship only the conservative predicate class (§2.3 `create_market`). |
| **G4 Epoch-day seam** | 2–3 | Feed a **near-UTC-midnight** bundle; determine whether `validate_stat` keys the root off `ts` or off `update_stats.min_timestamp` (TECH-REFERENCE §7 warns they can disagree → wrong PDA). | Lock §2.3 step 3 to whichever the program uses. |
| **G5 Tx size** | 2–3 | Assemble a *worst-case* `resolve` tx (high-event fixture on a multi-fixture day) **including the ComputeBudget ix** and assert serialized size **< 1232 B**. Spike bundle was 13 ProofNodes ≈ 429 B on a `mainTree=1` day (log:16); busy days grow `main_tree_proof` ~log₂(fixtures). | Pin the demo to a low-event/low-fixture fixture and document it. No chunking escape — `validate_stat` needs all proofs in one call. |
| **G6 Golden bundle** | 2–3 | **Commit to the repo** a frozen proof bundle + the (permanently on-chain) daily root for one chosen fixture. `/api/scores/historical/{fixtureId}` only serves **2 weeks–6 h ago** (TECH-REFERENCE §5); judging is Jul 19–29 and matches may be over (HACKATHON-BRIEF L13). | Demo becomes un-reproducible at judge-time. The golden bundle makes `resolve` deterministic and endpoint-independent. |

> **Plan B (decide the trigger date in writing, now).** There is **no non-CPI shortcut** — Solana clears return data between top-level instructions, so a separate top-level `validate_stat` cannot feed a separate escrow ix; the CPI is mandatory. And the shipped `settle_trade` escrow is rejected (its `create_trade` needs the 3-signer TxODDS authority co-sign — TECH-REFERENCE §8). **If G0/G1 are red by Day 4:** fall back to a *narrated* receipt — keeper lands `validate_stat` top-level (proven to work, log) and an off-chain/multisig escrow releases — uglier, still demoable, "the proof is on-chain." **[OPEN — user decision: confirm the Day-4 Plan-B trigger and that the fallback is acceptable.]**

---

### 2.0.2 Build scope — front-load the unknowns, cut the cosmetics

Greenfield Rust, solo, ~19 days, *also* owning ingestion/Market-Gen/Keeper/Frontend. Scope is deliberately minimal.

- **v1 CORE (must ship):** `create_market` → `stake` → `resolve` (the CPI hero) → `claim`. **Single-stat only.** Events on all three of stake/resolve/claim. `proven_value` stored. Fee raked on the **losing pool** (§2.4).
- **STRETCH (only if core lands by Day 6):** `refund` + the one-sided `Void` branch (needed only if you *demo* the void path); `close_market` (rent reclaim — judges don't grade this).
- **CUT from v1:** `lock` (self-admittedly cosmetic), `Config` (caller supplies `market_id`), and the **entire two-stat path** (`op`/`stat_b` logic, `InvalidPredicateConfig`, `SecondStatMismatch`, the `Option<StatTerm>` branch). Keep `stat_b_*`/`op`/`proven_value_b` *fields* in `Market` as always-`None` forward-compat, but do not implement or test the two-stat path — it is the trickiest serialization in the section and is not in the hero demo.

This removes ~4 instructions, ~10 error codes, and the hardest Borsh branch — a ~3–4 day saving that buys the Phase-0 gates.

---

### 2.1 Account structs (exact fields + types)

All structs are Anchor accounts (8-byte discriminator). **Size via `#[derive(InitSpace)]`** — do not hand-count `space` (the earlier "~267 B" was a guess; each `Option<T>` costs 1 tag byte + payload). Collateral is a devnet test-stablecoin mint we control ("USDC"); the vault is **mint-agnostic** — mirrors the shipped `TradeEscrow`, which stores **no mint field** (devnet.mdx:2992; TECH-REFERENCE §8). **Mint our USDC as legacy SPL, 6 dp, and pin its address as a constant before writing any token CPI** (TECH-REFERENCE §2: vault + every transfer must use the *matching* token program; TxL is Token-2022, ours is legacy SPL).

#### `Market` (PDA)
```rust
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub bump: u8,
    pub vault_bump: u8,
    pub market_id: u64,             // caller-supplied, PDA seed (PDA collision = dedup)
    pub creator: Pubkey,
    pub mint: Pubkey,               // collateral SPL mint (legacy SPL devnet USDC)
    pub fixture_id: i64,            // TxLINE Fixture.fixture_id (devnet.mdx)
    pub fee_destination: Pubkey,    // token account that receives fee + dust at close

    // --- COMMITTED predicate (immutable after create => trustless resolve) ---
    pub stat_a_key:    u32,         // ScoreStat.key (monotone cumulative keys, §2.3)
    pub stat_a_period: i32,         // ScoreStat.period (the FT-terminal period — value G3-confirmed)
    pub stat_b_key:    Option<u32>, // v1: always None (forward-compat)
    pub stat_b_period: Option<i32>, // v1: always None
    pub op:            Option<u8>,  // v1: always None (0=Add,1=Subtract, devnet.mdx:2267)
    pub threshold:     i32,         // TraderPredicate.threshold (devnet.mdx:3103)
    pub comparison:    u8,          // 0=GreaterThan,1=LessThan,2=EqualTo (devnet.mdx:2281)

    // --- lifecycle (ALL timestamps in MILLISECONDS — one unit across the file) ---
    pub resolve_after_ts: i64,      // unix MS; lock boundary; MUST be past final whistle (§2.8)
    pub created_at:       i64,      // ms
    pub resolved_at:      i64,      // ms
    pub state:            u8,       // 0 Open,1 Locked,2 Resolved,3 Void,4 Closed
    pub outcome:          u8,       // 0 Unset,1 Yes,2 No

    // --- parimutuel accounting ---
    pub yes_pool:    u64,
    pub no_pool:     u64,
    pub yes_stakers: u32,           // UI/implied-prob display only (dual-side double-counts)
    pub no_stakers:  u32,           // UI/implied-prob display only
    pub total_positions: u32,       // canonical participant count (one per user) — close accounting
    pub fee_bps:     u16,           // capped MAX_FEE_BPS = 1000 (10%)
    pub fee_amount:  u64,           // cached at resolve = floor(losing_pool * fee_bps / 10000)
    pub payout_pool: u64,           // cached at resolve = winning_pool + (losing_pool - fee_amount)
    pub winning_pool:u64,           // cached at resolve (>0, guaranteed by one-sided guard)
    pub claimed_amount: u64,        // running sum (solvency/close accounting)
    pub claims_count:   u32,

    // --- Proof-Receipt artifact (set at resolve; powers the hero UI, §2.9) ---
    pub proven_value_a: i32,        // the VALUE the Merkle proof revealed for stat_a
    pub proven_value_b: Option<i32>,// v1: None
    pub daily_root:     Pubkey,     // the txoracle daily-root PDA used
    pub epoch_day:      u16,        // the day the root was keyed to
    pub event_stat_root:      [u8;32], // stat_a.event_stat_root (proven)
    pub events_sub_tree_root: [u8;32], // fixture_summary.events_sub_tree_root (proven)
    pub resolve_ts: i64,            // ms; the validate_stat `ts` arg used
    pub _reserve: [u8; 16],
}
```
> `stat_a.value` is **NOT** committed at create — the *value* is whatever the proof reveals at `resolve`. We commit only *which* stat (`key`,`period`), the `threshold`, and the `comparison`. The proven value is then *recorded* in `proven_value_a` for the receipt.

#### `Position` (PDA)
```rust
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub bump: u8,
    pub market: Pubkey,   // has_one
    pub owner:  Pubkey,   // has_one
    pub yes_amount: u64,
    pub no_amount:  u64,
    pub claimed: bool,    // double-claim guard
    pub _reserve: [u8; 16],
}
```
One `Position` per (market,user); a user may stake either or both sides across multiple `stake` calls.

#### Vault — standard SPL token account (no custom struct)
Created via Anchor `init` with `token::mint = mint`, `token::authority = market`. The **`Market` PDA is the token authority**; all outbound transfers are signed with the market's seeds. Mirrors the shipped escrow vault pattern (`escrowVault` authority = escrow PDA; TECH-REFERENCE §8). Use the **legacy SPL** token program to match the USDC mint.

`Config` singleton — **CUT from v1** (caller-supplied `market_id` suffices).

---

### 2.2 PDA seed scheme

| PDA | Seeds | Owner |
|---|---|---|
| `Market` | `[b"market", market_id.to_le_bytes()]` | proofmarket |
| `Vault` (token acct) | `[b"vault", market.key().as_ref()]` | SPL Token; authority = Market PDA |
| `Position` | `[b"position", market.key().as_ref(), owner.key().as_ref()]` | proofmarket |

Vault-transfer signer seeds (`claim`/`refund`/`close`):
```
&[b"market", &market.market_id.to_le_bytes(), &[market.bump]]
```

**External read-only PDA pinned in `resolve`:** txoracle daily-scores root — seeds `[b"daily_scores_roots", epoch_day.to_le_bytes() /* u16 LE */]`, **owner = `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`**, `epoch_day = floor(ts_ms / 86_400_000)`. Verified live: `epochDay=20634 → BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` (EXISTS, 9232 B, owner=txoracle; log:18). **`epoch_day` derivation source (`ts` vs `update_stats.min_timestamp`) is locked by Gate G4.** Use `u16::try_from(ts / 86_400_000).map_err(|_| WrongRootAccount)?` — never a silent `as u16` truncating cast.

---

### 2.3 Instruction set (exact args + accounts) — v1 CORE = create/stake/resolve/claim

#### `create_market`
**Args:** `market_id: u64`, `fixture_id: i64`, `stat_a_key: u32`, `stat_a_period: i32`, `threshold: i32`, `comparison: u8`, `resolve_after_ts_ms: i64`, `fee_bps: u16`. *(v1 omits `stat_b`/`op` args; fields stored as `None`.)*
**Accounts:** `creator` (signer, mut) · `market` (init, PDA `[b"market",market_id]`, mut) · `vault` (init, PDA `[b"vault",market]`; `token::mint=mint`, `token::authority=market`) · `mint` (read) · `fee_destination` (read; token account of `mint`) · `token_program` · `system_program` · `rent`.
**Checks:** `fee_bps <= 1000` (`FeeTooHigh`); `resolve_after_ts_ms > now_ms` else `ResolveTooEarly`.
**v1 predicate-soundness restriction (the finality guard at the source):** `require(comparison == GreaterThan)` **and** `require(stat_a_key ∈ MONOTONE_CUMULATIVE_KEYS)` (goals/corners/cards — values only *increase* during play, then freeze at FT) else `UnsupportedPredicate`. Rationale in §2.8. **[OPEN — user decision: the exact `MONOTONE_CUMULATIVE_KEYS` allowlist + whether to broaden to `LessThan`/`EqualTo` *after* G3 confirms post-FT leaf semantics.]** Set `state=Open`, `outcome=Unset`, zero pools, `created_at=now_ms`. Emit `MarketCreated`.

#### `stake`
**Args:** `side: bool` (true=YES), `amount: u64`.
**Accounts:** `user` (signer, mut) · `market` (mut) · `position` (init_if_needed, PDA `[b"position",market,user]`, mut) · `vault` (mut) · `user_token_account` (mut; owner=user, mint=market.mint) · `mint` (read) · `token_program` · `system_program`.
**Logic:** `require(state == Open)` else `MarketNotOpen`; `require(now_ms < market.resolve_after_ts)` else `MarketLocked` (time-gated — no crank needed); `require(amount > 0)` else `ZeroAmount`; `require(amount >= MIN_STAKE)` (e.g. `1_000` base units) else `StakeTooSmall`. CPI `transfer_checked(user_token_account → vault, amount, mint.decimals)`. On first-ever stake by this user: init `position.{market,owner,bump}`, `market.total_positions += 1`. If `side`: `position.yes_amount += amount`; if this user's first YES, `yes_stakers += 1`; `yes_pool += amount`. Else symmetric NO. All adds `checked_add` (`MathOverflow`). Emit `Staked`. *(`init_if_needed` requires the Anchor `init-if-needed` feature enabled or the build fails confusingly.)*

#### `resolve` — **permissionless**, the `validate_stat` CPI (the hero)
Keeper fetches the bundle from `/api/scores/stat-validation?fixtureId=&seq=&statKey=` (TECH-REFERENCE §5) and passes it through. Anyone may call.

**Args (pass-through to `validate_stat`, minus the committed predicate):**
- `ts: i64` (event ms; spike `1782788706633`, 13 digits)
- `fixture_summary: ScoresBatchSummary` = `{ fixture_id:i64, update_stats:ScoresUpdateStats{ update_count:i32, min_timestamp:i64, max_timestamp:i64 }, events_sub_tree_root:[u8;32] }` (devnet.mdx:2876/2909)
- `fixture_proof: Vec<ProofNode>`  (`ProofNode{hash:[u8;32], is_right_sibling:bool}`, devnet.mdx:2831)
- `main_tree_proof: Vec<ProofNode>`
- `stat_a: StatTerm` = `{ stat_to_prove:ScoreStat{key:u32,value:i32,period:i32}, event_stat_root:[u8;32], stat_proof:Vec<ProofNode> }` (devnet.mdx:2957/2852)
- `stat_b: Option<StatTerm>`  (v1: always `None`)

> `predicate {threshold, comparison}` and `op` are **rebuilt from `Market` storage**, never taken from the caller — this is what blocks a malicious resolver from changing the bet.

**Accounts:** `resolver` (signer, mut) · `market` (mut) · `daily_scores_merkle_roots` (read — the *only* account `validate_stat` itself needs, devnet.mdx) · `txoracle_program` (read, `address = 6pW64g…`).

**Step-by-step:**
1. **State/time gate.** `require(state == Open || state == Locked)` else `InvalidState`. `let now_ms = clock.unix_timestamp.checked_mul(1000)…`; `require(now_ms >= market.resolve_after_ts)` else `ResolveTooEarly`. *(Single seconds→ms conversion; everything else is already ms — removes the off-by-1000 seam.)*
2. **One-sided guard → Void.** `if yes_pool == 0 || no_pool == 0 { state = Void; resolved_at = now_ms; emit MarketVoided; return Ok(()) }`. No counterparty ⇒ no defined odds ⇒ everyone refunds. *(Reachable only if the demo seed script fails to stake both sides — see §2.8.)*
3. **Pin the root to the correct day.** `epoch_day = u16::try_from(ts / 86_400_000)?` *(source `ts` vs `min_timestamp` locked by G4)*; `expected = find_program_address(&[b"daily_scores_roots", &epoch_day.to_le_bytes()], &TXORACLE_ID).0`; `require(daily_scores_merkle_roots.key() == expected)` else `WrongRootAccount`; `require(daily_scores_merkle_roots.owner == &TXORACLE_ID)`.
4. **Bind proof to the committed market.** `require(fixture_summary.fixture_id == market.fixture_id)` (`FixtureMismatch`); `require(stat_a.stat_to_prove.key == market.stat_a_key && stat_a.stat_to_prove.period == market.stat_a_period)` (`PredicateMismatch`); `require(stat_b.is_none())` (v1; `UnexpectedSecondStat`).
5. **Finality binding (the rule lives HERE, not in a caveat).** `require(fixture_summary.update_stats.max_timestamp >= market.resolve_after_ts)` (`StaleFinalBatch`) — forces the proven batch to come from **after** the lock boundary. Because v1 restricts to monotone-cumulative stats (step in `create_market`) **and** `resolve_after_ts` is set past the final whistle (§2.8), the score is **frozen** after lock, so every admissible post-lock leaf carries the *same final value* and batch/seq choice cannot change the outcome. **[Conditional on G3]:** if the spike shows leaves are per-seq with no unique terminal, additionally bind the canonical final leaf (commit/record `seq` or require the last score-bearing batch). Until G3 is green, this is the v1 soundness boundary, stated plainly, not deferred.
6. **Rebuild predicate from storage.** `predicate = TraderPredicate{ threshold: market.threshold, comparison: market.comparison.into() }`; `op = market.op.map(Into::into)` (v1: `None`).
7. **CPI `validate_stat` — lead with the clean path.**
   - **Preferred (try first in G1).** `declare_program!(txoracle)` from the v1.5.2 IDL, then `let predicate_true = txoracle::cpi::validate_stat(cpi_ctx, ts, fixture_summary, fixture_proof, main_tree_proof, predicate, stat_a, stat_b, op)?.get();` — Anchor 0.31.1 `Return<bool>` codegen handles the nested `Vec<ProofNode>`/`Option<StatTerm>` Borsh for us. Cleanest for Code Quality; isolates the one undocumented mechanism into generated code.
   - **Fallback (only if 0.31.1 codegen misbehaves).** Raw `invoke` with hand-rolled discriminator + Borsh tuple:
     ```rust
     const DISC: [u8;8] = [107,197,232,90,191,136,105,185]; // devnet.mdx:1526-1535
     let mut data = DISC.to_vec();
     // IDL arg order: ts, fixture_summary, fixture_proof, main_tree_proof, predicate, stat_a, stat_b, op
     (ts, &fixture_summary, &fixture_proof, &main_tree_proof,
      &predicate, &stat_a, &stat_b, &op).serialize(&mut data)?;
     let ix = Instruction { program_id: TXORACLE_ID,
         accounts: vec![AccountMeta::new_readonly(daily_scores_merkle_roots.key(), false)], data };
     invoke(&ix, &[daily_scores_merkle_roots.to_account_info(), txoracle_program.to_account_info()])?;
     ```
     Borsh: ints LE; `[u8;32]` raw (no len); `Vec<T>` = u32-LE len + items; `Option` = 1-byte tag + payload; enums = 1-byte variant index (`GreaterThan=0,LessThan=1,EqualTo=2`; `Add=0,Subtract=1`). Anchor per-arg encoding == concatenated Borsh, so the tuple-serialize is layout-correct. Then read return data **as the very next statement** (`set_return_data` is overwritten by the most-recent callee):
     ```rust
     let (ret_program, ret) = get_return_data().ok_or(NoReturnData)?;
     require!(ret_program == TXORACLE_ID, WrongOracleProgram);
     let predicate_true = match ret.as_slice() { [1]=>true, [0]=>false, _=>return err!(BadReturnData) };
     ```
8. **Record the proven value + receipt fields.** `proven_value_a = stat_a.stat_to_prove.value`; `daily_root = daily_scores_merkle_roots.key()`; `epoch_day`; `event_stat_root = stat_a.event_stat_root`; `events_sub_tree_root = fixture_summary.events_sub_tree_root`; `resolve_ts = ts`.
9. **Settle accounting (fee on losing pool — §2.4).** `outcome = if predicate_true { Yes } else { No }`; `winning_pool = if predicate_true { yes_pool } else { no_pool }` (>0 by step 2); `losing_pool = total − winning_pool`; `fee_amount = (losing_pool as u128 * fee_bps as u128 / 10000) as u64`; `payout_pool = winning_pool + (losing_pool − fee_amount)`; `resolved_at = now_ms`; `state = Resolved`. **No fund movement here** — winners pull via `claim`.
10. **Emit `MarketResolved`** (§2.9) — the self-authenticating receipt.

> If the proof is forged, txoracle's Stage-1/Stage-2 Merkle check errors → the CPI reverts → the whole `resolve` tx reverts; griefer burns only their own ~260k-CU fee. **This revert behavior is asserted-but-unverified until Gate G2 lands.**

#### `claim` (Resolved only)
**Accounts:** `user` (signer, mut) · `market` (mut) · `position` (mut, PDA, `has_one=owner`, `has_one=market`, `close=owner` *(returns rent on the final claim — also covers losing-side stakers, see below)*) · `vault` (mut) · `user_token_account` (mut, owner=user) · `mint` · `token_program`.
**Logic:** `require(state == Resolved)` else `NotClaimable`; `require(!position.claimed)` else `AlreadyClaimed`. `winning_stake = if outcome==Yes { position.yes_amount } else { position.no_amount }`.
- **Loser-rent recovery:** if `winning_stake == 0`, this is a losing-only position — set `claimed=true`, emit `Claimed{payout:0}`, and let Anchor `close=owner` return the `Position` rent. No `NothingToClaim` dead-end (fixes stranded rent). *(Alternative: a separate `close_position` — folding it into `claim` keeps the instruction count at 4.)*
- **Payout (u128):**
  ```
  payout = (winning_stake as u128 * payout_pool as u128 / winning_pool as u128) as u64
  ```
  Set `position.claimed = true` **before** the transfer; `market.claimed_amount += payout`; `market.claims_count += 1`. CPI `transfer_checked(vault → user_token_account, payout, decimals)` signed with market seeds (§2.2). Emit `Claimed`.

#### `refund` (Void only) — **STRETCH**
Same accounts as `claim`. `require(state == Void)` (`NotVoid`); `require(!position.claimed)`; `refund = position.yes_amount + position.no_amount`; `require(refund > 0)`; mark claimed; `claimed_amount += refund`; transfer signed by market; Anchor `close=owner`. **No fee on void.**

#### `close_market` — **STRETCH** (rent reclaim; judges don't grade it)
`creator` (signer, mut) · `market` (mut, close=creator) · `vault` (mut) · `fee_destination` (mut, == `market.fee_destination`) · `mint` · `token_program`.
`require(state==Resolved || state==Void)` else `MarketNotSettled`. **Gate purely on `now_ms >= resolved_at + CLOSE_GRACE`** (drop the fuzzy "all winners claimed" count — dual-side stakers break it; `CLOSE_GRACE` subsumes it). Sweep remaining vault balance → `fee_destination`, `close_account(vault)` (`VaultNotEmpty` guard), Anchor-close `market` → rent to creator. **[OPEN — user decision: forfeiture policy for unclaimed *winnings* after `CLOSE_GRACE`. Sweeping a winner's principal to the creator is off-brand for "fair/just math." Options: (a) keep the vault open indefinitely for claims and let close reclaim only fee+dust; (b) route forfeited winnings to a neutral sink (burn/treasury). Recommend (a) or (b), not creator.]**

`lock`, `void_market`, `Config` — **CUT from v1** (`stake` is already time-gated; the seed script controls the demo timeline; void liveness is covered by the Void branch in `resolve` plus, if needed, a stretch `void_market` with a generous grace).

---

### 2.4 Parimutuel math (exact — fee raked on the LOSING pool)

The draft's old "fee on whole handle" makes **winners net-negative in lopsided markets** (e.g. yes=950/no=50, fee_bps=1000 → each YES winner gets `stake·900/950`, a **5.3% loss on a winning bet**) — and lopsided pools (heavy favorites) are the *normal* case in sports. Fixed by raking the losing pool only:

- `total = yes_pool + no_pool`; `winning_pool` = winning side; `losing_pool = total − winning_pool`.
- **Fee:** `fee_amount = floor(losing_pool * fee_bps / 10000)`  (`fee_bps ≤ 1000`, so `fee_amount ≤ losing_pool`).
- **Distributable:** `payout_pool = winning_pool + (losing_pool − fee_amount)`.
- **Per-winner payout (floor):** `payout_i = floor(stake_i * payout_pool / winning_pool)`.
- **Net (now provably ≥ 0):** `net_i = stake_i · (losing_pool − fee_amount) / winning_pool ≥ 0` for every winner, always — the "no winner is ever short-paid" invariant is now **true**.
- **Solvency:** `Σ stake_i = winning_pool` ⇒ `Σ payout_i ≤ payout_pool = total − fee_amount ≤ total =` vault balance. Floor guarantees the vault can never be overdrawn.
- **Dust:** `dust = payout_pool − Σ payout_i ≥ 0` stays in the vault; `dust + fee_amount` swept at `close_market` (stretch) or held.
- **One-sided pool:** voided in `resolve` step 2 → `refund` returns 100%, no fee.
- **Divide-by-zero:** impossible — `winning_pool > 0` after the one-sided guard.
- **Double-claim:** `position.claimed` set in the same ix as the transfer + Anchor account borrow.

---

### 2.5 Lifecycle state machine (v1 core solid; Void/Closed are stretch)

```
create_market
     │
     ▼
 ┌────────┐  (no crank: stake is time-gated)                ┌────────┐
 │  Open  │ ───────────────────────────(optional Locked)──► │ Locked │   [Locked = CUT in v1]
 └───┬────┘                                                  └───┬────┘
     │  resolve (now_ms ≥ resolve_after_ts)                      │
     │  ├─ both pools>0 ─► validate_stat CPI ─► Resolved ◄───────┘
     │  └─ one pool==0  ─────────────────────► Void
     ▼
 (stake legal only while Open & now_ms < resolve_after_ts)
          Resolved ──claim*(closes position)──► [close_market → Closed]   (stretch)
          Void     ──refund*(stretch)─────────► [close_market → Closed]   (stretch)
```

| State | Legal | Illegal |
|---|---|---|
| Open | `stake` (now_ms<lock), `resolve` (now_ms≥lock) | `claim`,`refund`,`close` |
| Resolved | `claim`, `close_market`(stretch) | `stake`,`resolve`,`refund` |
| Void | `refund`(stretch), `close_market`(stretch) | `stake`,`resolve`,`claim` |
| Closed | — terminal | everything |

---

### 2.6 Compute budget

`validate_stat` CPI consumes **~205,264–205,266 CU** (log:30/43, TRUE/FALSE). Our `resolve` overhead (Borsh-serializing ~13-node proof vectors, asserts, one state write, event emit, no token transfer) adds an estimated **20–60k CU** → total ≈ **260k**, above the **default 200k per-instruction limit**, so the resolver tx **must** prepend `ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })` (cap ≤ 1.4M for a real `.rpc()`; the 10M figure in the official example is `.view()`-only — TECH-REFERENCE §7). **This ComputeBudget ix must be counted in the Gate-G5 tx-size check.** `stake`/`claim`/`refund` (single CPI transfer) run fine under default budget.

---

### 2.7 Error codes (`#[error_code]`, our **6100-namespace** — offset to avoid log-debugging collisions)

The draft reused 6024/6025/6026, which **semantically collide** with txoracle's `InvalidStatCombination/MissingSecondStat/UnexpectedSecondStat` (TECH-REFERENCE §7) — when the CPI reverts, txoracle surfaces *wrapped*, so a bare `6025` in logs would mean two different things. Offset removes the foot-gun.

```
6100 MarketNotOpen          // stake when state != Open
6101 MarketLocked           // stake at/after resolve_after_ts
6102 ZeroAmount
6103 StakeTooSmall
6104 FeeTooHigh             // fee_bps > 1000
6105 UnsupportedPredicate   // v1: comparison != GreaterThan or key not in monotone allowlist
6106 ResolveTooEarly        // now_ms < resolve_after_ts (also: create with past ts)
6107 InvalidState           // resolve when state ∉ {Open,Locked}
6108 WrongRootAccount       // daily_scores PDA mismatch / wrong owner / ts day overflow
6109 FixtureMismatch        // fixture_summary.fixture_id != market.fixture_id
6110 PredicateMismatch      // proven key/period != committed
6111 UnexpectedSecondStat   // v1: stat_b must be None
6112 StaleFinalBatch        // max_timestamp < resolve_after_ts (finality guard)
6113 WrongOracleProgram     // CPI target or return program_id != txoracle
6114 NoReturnData           // get_return_data() == None
6115 BadReturnData          // return ∉ {[0],[1]}
6116 MathOverflow
6117 NotClaimable           // claim when state != Resolved
6118 AlreadyClaimed
6119 NotVoid                // refund when state != Void  (stretch)
6120 MarketNotSettled       // close when state ∉ {Resolved,Void}  (stretch)
6121 VaultNotEmpty          // close_account precondition  (stretch)
```

---

### 2.8 Security model

- **`resolve` is permissionless and safe — for the v1 predicate class.** Bindings: (1) `daily_scores_merkle_roots` pinned to the day-derived PDA **and** `owner==txoracle`; (2) `txoracle_program` pinned by `address` **and** the return `program_id` re-checked; (3) `stat_a` key+period and `fixture_id` pinned to the market's immutable commitments; (4) `predicate{threshold,comparison}` rebuilt from storage, never the caller; (5) the YES/NO bool read from txoracle return data, not tx success. **Worst-case griefing = the caller wastes their own ~260k-CU fee.**
- **Settlement finality — the honest boundary (the claim a settlement-track judge WILL stress-test).** `validate_stat` proves "stat *K* had value *V* in *some* published batch," **not** "the match ended with *V*." A permissionless resolver chooses the batch (`…&seq=`). v1 closes this with three combined constraints, not prose: **(a)** markets are restricted to **monotone-increasing cumulative stats** (goals/corners/cards) so the value never decreases; **(b)** `resolve_after_ts` is set **generously past the latest plausible final whistle** so post-lock the score is *frozen*; **(c)** step-5 forces the proven batch to be post-lock. The *actual* enforcement against an early/low-batch backward-pick is constraint (c) (the `max_timestamp >= resolve_after_ts` bind); (a) is belt-and-suspenders that also keeps the demo legible. Together, every admissible leaf carries the same final value → batch choice is irrelevant. **What this does NOT yet cover (UNVERIFIED until G3):** that post-FT batches still publish a score leaf and that `(key, period=FT)` is a unique terminal leaf; and `LessThan`/`EqualTo`/non-monotone/two-stat predicates are **out of v1 scope** precisely because they are *not* sound under arbitrary leaf choice. The tagline holds only with this scoping: **"No vote. No dispute window. Just math — for terminal, monotone full-time stats."**
- **`resolve_after_ts` is a staker-visible trust parameter.** It is creator-chosen and is the *only* on-chain finality anchor (a value set before true full-time would enable resolving a non-final score). The UI **must** display it; Market Gen (Section 3) must set it past stoppage/ET/penalties. **[OPEN — user decision: the kickoff-margin policy, e.g. kickoff + ~140 min to cover ET + penalties for knockout fixtures, and whether to add an on-chain sanity bound once G3/G4 pin feed semantics.]**
- **Claim guards:** `has_one=owner` + `has_one=market` + `claimed` flag + `state==Resolved` + winner check. Destination ATA is the user's own — no third party can redirect a payout.
- **Vault authority:** authority = `Market` PDA; the only outbound transfers are `claim`/`refund` (dest = position owner) and `close` (dest = `market.fee_destination`). No instruction moves vault funds to an arbitrary address. Signed exclusively with `[b"market", market_id_le, bump]`.
- **Creator powers are minimal & committed:** predicate/fee set **once** at create, immutable; creator can only reclaim rent + sweep fee/dust (subject to the §2.3 forfeiture `[OPEN]`). Cannot alter outcome, change `fee_bps`, or seize stakes; `fee_bps` capped at 10%.
- **Void incentive note (stretch path):** if a stretch `void_market` is added, a *losing* participant could force a refund once its grace elapses if no winner resolves first. Mitigate with a generous grace; documented trade-off, not a fund-loss bug.

---

### 2.9 Events & the Proof-Receipt artifact — the demo centerpiece (highest judge leverage)

HACKATHON-BRIEF L28/L33 mark the **Verifiable Resolution UI ("show the Merkle-proof receipt")** as *highly valued*. The draft discarded every value the receipt needs and emitted **zero events** — degrading "verifiable" to "trust the keeper's JSON." Fixed:

**`resolve` emits a single self-authenticating event** from which the entire receipt is reconstructable with no indexer:
```rust
#[event] pub struct MarketResolved {
    pub market: Pubkey, pub fixture_id: i64,
    pub stat_a_key: u32, pub stat_a_period: i32,
    pub proven_value_a: i32, pub proven_value_b: Option<i32>,
    pub threshold: i32, pub comparison: u8, pub op: Option<u8>,
    pub predicate_true: bool, pub outcome: u8,
    pub daily_root: Pubkey, pub epoch_day: u16,
    pub event_stat_root: [u8;32], pub events_sub_tree_root: [u8;32],
    pub resolve_ts: i64,
    pub yes_pool: u64, pub no_pool: u64,
    pub fee_amount: u64, pub payout_pool: u64, pub winning_pool: u64,
    pub resolver: Pubkey,
}
```
Plus `MarketCreated`, `Staked{ market, owner, side, amount, yes_pool, no_pool }`, `Claimed{ market, owner, payout }`, `MarketVoided`. The receipt then renders the full chain **stat leaf → `event_stat_root` → `events_sub_tree_root` → `daily_root` PDA → `validate_stat` TRUE → release** with on-chain provenance, e.g. *"Argentina scored `proven_value_a=1`; threshold `>0` (GreaterThan) → YES"* (consistent with the v1 GreaterThan-only restriction, §2.3), independently re-verifiable.

**The `resolve` transaction is the primary demo artifact.** Name the program/instructions so the explorer reads like a receipt; the `invoke` surfaces `validate_stat` as a **visible nested instruction** on Solana Explorer, whose inner logs already show "Stage 1 Validation," "Stage 2 Validation," "Predicate evaluated to: true," "Program return … `AQ==`" (log:25-32). The money shot — **one tx, ~205k-CU inner CPI, settled, `MarketResolved` at top level** — is contrasted directly with betmoar/UMA's *103 voters + multi-hour reveal + dispute window*. Pre-stage the **G6 golden fixture + already-on-chain daily root** (epochDay 20634, log:18) so this receipt reproduces during judging even though matches are over (HACKATHON-BRIEF L13).

**Demo determinism (Phase-0 artifacts):** (1) a seed script funding **3–4 legacy-SPL devnet keypairs** that stake a fixed YES/NO split on the golden fixture *before* `resolve` (a parimutuel pool is only interesting — and only avoids the Void branch — with ≥2 opposite-side stakers; reproducible payouts); (2) the committed golden proof bundle + daily root; (3) the pinned legacy-SPL USDC mint constant.

---

### Caveats / UNVERIFIED — each mapped to a Phase-0 gate

1. **Toolchain (Gate G0).** No `solana` CLI / `cargo-build-sbf` / anchor 0.31.1 (avm 0.30.1) — TECH-REFERENCE §10. #1 risk; Day-1 budget + Day-4 Plan-B trigger `[OPEN]`.
2. **CPI return-decode (Gate G1).** `get_return_data()` from a *CPI consumer* is undocumented in the repo (zero example); the spike log is a **top-level simulate** encoded with the stale v1.4.2 IDL, not a landed CPI. Inferred from `AQ==`/`AA==` + standard semantics; must land on devnet. Try `declare_program!` first.
3. **Forged-proof revert (Gate G2).** The §2.8 trust model assumes a tampered proof *reverts* inside `validate_stat`; the spike only ran **valid** proofs. If a bad proof returns `false` instead of reverting, permissionless `resolve` is unsafe → gate a trusted resolver until verified.
4. **Finality / seq semantics (Gate G3).** Whether post-FT batches carry the score leaf and whether `(key, period=FT)` is latest-wins/unique-terminal is UNVERIFIED; `period:7` mapping vs `(period*1000)+base` (TECH-REFERENCE §6a) unresolved (one data point: `value=1, period=7, key=1`, log:14-15). The v1 monotone-GreaterThan restriction is the conservative boundary until this lands.
5. **Epoch-day source (Gate G4).** `ts` vs `update_stats.min_timestamp` can disagree across UTC midnight → wrong root PDA (TECH-REFERENCE §7). Lock step 3 to whichever `validate_stat` uses internally.
6. **Tx size (Gate G5).** 1232-byte cap; 13-node bundle ≈ 429 B on a quiet day; busy days + ComputeBudget ix may overflow with no chunking escape. Verify worst-case, else pin a low-event fixture.
7. **Historical window (Gate G6).** `/api/scores/historical/{fixtureId}` serves only 2 wk–6 h ago (TECH-REFERENCE §5); commit a frozen golden bundle so judging is endpoint-independent.

---

## Section 3 — Data & Market Generation

### 3.0 Scope & trust framing

This section owns everything *before* funds move: how raw TxLINE data becomes a set of on-chain markets, and how a final-stat Merkle proof is selected and shaped into the proof-args our escrow's `resolve()` consumes. The escrow (the only fund-moving trust surface) is Section 2; here we produce its *inputs* and the resolution artifact the "Proof Receipt" UI (Section 4) renders.

**The integrity property — stated precisely (corrected from the draft).** Two distinct guarantees, only the first of which is empirically proven today:

1. **Predicate-binding (design-enforced).** Every market's *full predicate set* — `{statKeyA, statKeyB, op, comparison, threshold}` per sub-predicate, the `combinator`, the `marketScopePeriod`, and a `titleHash` — is hashed into `market_id` (§3.4) and stored verbatim on the `Market` account. `resolve()` rebuilds the CPI args **from the account**, never from keeper input, so a keeper cannot point an existing pool at a different predicate, add/drop a sub-predicate, or mislabel the market. This is enforced by construction.
2. **Outcome-authenticity (proof-enforced).** The outcome comes from a real Merkle proof checked **inside** `validate_stat` against the on-chain `daily_scores_roots` PDA, whose bytes the keeper cannot mint. **VERIFIED:** a *valid* proof returns the correct bool (`AQ==`/`AA==`) and the CPI succeeds either way — both TRUE (`value<2`) and FALSE (`value<1`) ran `err=null`, ~205k CU (`validate-sim.log:21-45`). **UNVERIFIED — see P0-f:** the failure mode of a *forged/corrupted* proof. The spike only ran valid proofs; the program's "Stage 1 / Stage 2 Validation" logs (`validate-sim.log:25-26`) indicate a bad Merkle path **reverts at reconstruction**, it does **not** "return false." State the property conservatively: *an invalid proof causes the `validate_stat` CPI to revert, so `resolve()` fails and the market stays unresolved (safe — no mis-settlement); the keeper still cannot forge an outcome because it cannot produce a proof that reconstructs to a root it does not control.* Do **not** claim "returns the wrong/false bool" until P0-f records revert-vs-false.

> Honesty note for synthesis: the spike script's own VERDICT printed `✗ Unexpected` (`validate-sim.log:47-48`) because it wrongly assumed assert-or-revert (the comment at `validate-sim.ts:91` expected `PredicateFailed 6021` on the FALSE case). The proof of success is in the **return bytes** (`AQ==`/`AA==`), not tx status. Any agent re-reading that log must not mistake the `✗` for a failure.

---

### 3.0a Phase-0 de-risk gates (run FIRST — each is a hard gate that re-scopes downstream)

The demo core depends on **two mechanisms that have never returned a single success on devnet** (the two-stat bundle path; a custom `validate_stat`-CPI program) and on a replay anchor that is a non-final record. Phase 0 converts each unknown into a gate with a defined fallback, so the build cannot silently collapse. This is the day-1–3 work; nothing in §3.2-TIER1 / §3.3 on-chain materialization / §3.5 fund-move is trusted until its gate passes.

| Gate | Deliverable | Blocks | Fallback if it fails |
|---|---|---|---|
| **P0-a Toolchain** | install `solana` CLI + `cargo-build-sbf` + anchor **0.31.1** (local is 0.30.1, `solana`/`cargo-build-sbf` absent — TECH-REF §10) | building the custom escrow (Section 2) | client-side `.view()`/simulate receipt (**proven**) for the *receipt*; fund-move falls back to a **minimal self-owned escrow** or a **receipt-only (no on-chain fund move)** demo. ⚠ Do **not** assume shipped `settle_trade` is a clean floor — it needs a `TradeEscrow` set up via `create_trade` (3-signer, TxODDS-authority co-sign, **UNVERIFIED callable** — TECH-REF §8 L167), the exact dependency locked-decision #2 rejected (§3.7) |
| **P0-b 1.5.2 re-encode** | re-run single-stat `validate_stat` under the **devnet.mdx v1.5.2** IDL (the only proven run used the **stale 1.4.7** `idl/txoracle.json`, `validate-sim.ts:21`, forbidden by TECH-REF §0/§11) | trusting the §3.5 arg byte-layout | re-derive layout from mdx; watch `update_count` i32-vs-u32 drift (TECH-REF §11) |
| **P0-c GT/EQ single-stat** | trivial sim: `key1 GreaterThan 0` (expect TRUE), `key2 EqualTo 0` (only `LessThan` was ever executed — `validate-sim.ts:92-93`) | TIER-0 GT/EQ markets | restrict TIER 0 to its **LessThan-expressible subset** (still demoable — see §3.2) |
| **P0-d Two-stat 200 + Add** | land **one** `&statKey2=` 200 bundle, then sim `Add(7,8) GreaterThan N`; cache the JSON. The two-stat `&statKey2=` path was **never exercised against a populated record** — a single-stat 200 *did* land (`probe-proofs4.log:19`), but the `statKey2` branch (`probe-proofs.ts:98-107`) never reached a real fixture; `statToProve2`/`statProof2` are inferred (`probe-proofs.ts:104-106`) and **`eventStatRoot2` appears in no probe at all — a pure guess** | TIER-1a (corners, O/U total goals, yellows) | drop TIER 1; ship TIER-0-only v1 |
| **P0-e Subtract operand order** | run an **asymmetric** two-stat fixture where `statB > statA`; record whether the engine computes `A−B` or `B−A`. IDL only says `BinaryExpression = Add\|Subtract` (TECH-REF §7) — **order is unspecified**; if it is `B−A`, every 1X2-Home/Away and handicap settles **backwards** (a wrong *outcome*, not a crash) | TIER-1b (1X2, handicap) | define markets to match the observed order, or drop all Subtract markets |
| **P0-f Forged-proof mode** | submit a corrupted `statProof` and a corrupted `eventStatRoot`; record revert-vs-false | the §3.0 trust wording | already worded conservatively (revert→unresolved) |
| **P0-g Confirmed final bundle** | capture a **real finished friendly's** `Confirmed:true` terminal record + its `stat-validation` bundle; **snapshot bundle JSON + the root-PDA account bytes to disk**. Every record captured so far is `Confirmed:false` (`probe-proofs4.log:13`) | the "settle only final confirmed" rule + the §3.7 *legitimate-outcome* claim | demo on the unconfirmed anchor, reframed as **CPI-mechanics** replay (§3.7) |
| **P0-h Phase-ID field** | observe one real `F`/`FET`/`FPE` record and confirm **which numeric field** carries it (`StatusId`, not `GameState`) | live match-end detection | replay resolves over a fixed `finalSeq`; **no live detection at all** (§3.5) |
| **P0-i Custom CPI + return-decode** | minimal Rust: CPI `validate_stat` (1 account `daily_scores_merkle_roots`, discriminator `[107,197,232,90,191,136,105,185]`), read `sol_get_return_data()`, AND the bools. **Repo has zero CPI/return-decode example** (TECH-REF §8/§10) | the entire `resolve()` fund-move + all compound markets | **degraded mode** (P0-a fallback): client-simulate the proof for the *receipt* (**proven**); for the fund-move see the P0-a caveat (shipped `settle_trade` is **not** a clean floor — TxODDS-authority `create_trade` prerequisite). Single-predicate only ⇒ BTTS drops to single-stat demo |

**Demo floor guarantee:** even if **only** P0-b passes (single-stat, LessThan, 1.5.2 IDL — the closest thing to already-proven), the LessThan-expressible TIER-0 subset (§3.2) plus the client-simulate Proof Receipt (§3.7) is a complete, honest, demoable submission. (The *receipt* is the proven floor; an on-chain fund-move is additive — see the P0-a / §3.7 caveat on `settle_trade`.) Everything above that floor is additive.

---

### 3.1 Reuse of the Ingestion Core (existing spike) — REUSE vs ADD

#### REUSE verbatim (already exercised on devnet in `step1-spike/`)

| Capability | Source (verified) | Notes |
|---|---|---|
| 4-step access flow (guest JWT → subscribe SL1 → activate) | `src/auth.ts`, `src/subscribe.ts`, `src/activate.ts`; driven in `validate-sim.ts` | SL1 free confirmed (`validate-sim.log:5`: `tokensPerWeek=0, leagueBundle=1`). Activation message `${txSig}:${leagues.join(",")}:${jwt}`, empty ⇒ `${txSig}::${jwt}` (TECH-REF §3) |
| Dual-header auth on every data call | `{ Authorization: Bearer <jwt>, "X-Api-Token": <apiToken> }` | TECH-REF §3 |
| Fixtures board fields | documented `Participant1/2(_Id), Participant1IsHome, FixtureId, StartTime, Competition, CompetitionId` (**TECH-REF §5 line 97**); `FixtureGroupId` observed live in the scores record (`probe-proofs4.log:13`) | **Correction:** the live field dump is from `/api/scores/updates` (`probe-proofs4.log:13`), **not** `/api/fixtures/snapshot` — the snapshot probe printed only `fixtures=17` (`probe-proofs2.log:11`). A field-level dump of `/api/fixtures/snapshot` is a Phase-0 re-probe; treat its exact shape as documented-but-not-locally-dumped |
| Scores decode (Stats map) | `/api/scores/updates/{fixtureId}`, `/api/scores/updates/{epochDay}/{hour}/{interval}`, `/api/scores/snapshot/{fixtureId}` | Live shape confirmed `probe-proofs4.log:13`: `Stats:{"1":1,"2":1,"3":0,"4":1,"7":5,"8":7,"1001":0,...}` — base + period-keyed in one map |
| **Proof-bundle fetch** (keeper's core input) | `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=[&statKey2=]` | Single-stat 200 shape confirmed `probe-proofs4.log:19-28`: `{ts, statToProve:{key,value,period}, eventStatRoot[32], summary:{fixtureId, updateStats:{updateCount,minTimestamp,maxTimestamp}, eventStatsSubTreeRoot[32]}, statProof[], subTreeProof[], mainTreeProof[]}` |
| `daily_scores_roots` PDA | `["daily_scores_roots", epochDay u16 LE]`, `epochDay=floor(ts/86_400_000)` (`validate-sim.ts:63-67`) | Root **verified to EXIST**: epochDay 20634 → `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe`, 9232 B, owned by `6pW64g…` (`validate-sim.log:18-19`) |
| `validate_stat` **client-side arg shaping** | `validate-sim.ts:74-100` builds the full 8-arg call + single account `{dailyScoresMerkleRoots: rootsPda}`, ~205k CU, both TRUE/FALSE (`validate-sim.log:21-45`) | **Scope of the proof (corrected):** what is proven is the *client-side TS proof-arg shaping*, generated from the **stale 1.4.7** IDL, single-stat, LessThan only. It is **not** proof of the in-program Rust CPI + `sol_get_return_data` decode (zero repo example, TECH-REF §8) and **not** proof of GT/EQ, two-stat, or the 1.5.2 byte layout. The keeper IDL must be **regenerated from devnet.mdx v1.5.2** (P0-b) |

**Critical field-rename to carry forward:** the API returns `summary.eventStatsSubTreeRoot`; the IDL `ScoresBatchSummary` field is `eventsSubTreeRoot` (snake `events_sub_tree_root`, devnet.mdx ScoresBatchSummary). The spike already maps it (`validate-sim.ts:88`). Keep this mapping — it is a silent decode hazard.

#### ADD (new for ProofMarket)

1. **Proper SSE client** for `/api/scores/stream` + `/api/odds/stream` (standard framing: split on blank line `/\r?\n\r?\n/`, JSON `data:`). **Do NOT** reuse the repo's `Message: ` parser — it is broken (mis-slices the prefix, silent empty catch; TECH-REF §11). Optional `Accept-Encoding: gzip` + `gunzipSync` (TECH-REF §5). **Scope note:** for v1 this drives **live UI animation only**, not the keeper trigger (§3.5 is one-shot replay).
2. **Market Generator** — fixtures snapshot → the §3.2 catalog → deterministic `market_id` (§3.4) → `create_market` ix list. Generates **all 104** fixtures off-chain; materializes on-chain only the demo set (§3.3).
3. **Two-stat bundle fetch** (`&statKey2=`) + `StatTerm` B assembly. **UNVERIFIED — gated on P0-d.** Never exercised against a real record; `statToProve2`/`statProof2` inferred (`probe-proofs.ts:104-106`), `eventStatRoot2` is a guess; shared `summary/subTreeProof/mainTreeProof` assumed.
4. **One-shot Keeper Resolver** over a **cached** bundle (§3.5).
5. **Resolution-Receipt builder** (§3.5 step 6) — the structured artifact the Proof Receipt UI renders (the brief's "highly valued" deliverable).
6. **Odds decode for the fair-value baseline** — **UNVERIFIED:** per-market price/probability wire encoding is **not in the repo** (TECH-REF §6b). **Stretch goal**, display-only, never on the settlement path. Prioritize the *decode spike* early only as the cheapest way to make the "TxLINE = live primary input" narrative concrete for the UX judge (it is otherwise thin, since parimutuel implied prob comes from the pool, not TxLINE).
7. **Replay harness** reading the **cached** bundle + root bytes from disk (§3.7).

---

### 3.2 Market catalog — tiered by *proven mechanism*, not by CPI count

**Expressiveness boundary (IDL, devnet.mdx:1560-1611):** one `validate_stat` evaluates exactly one comparison over one or two stats combined by at most one Add/Subtract:
```
single-stat:  statA.value                   {GT|LT|EQ}  threshold
two-stat:     (statA.value op statB.value)   {GT|LT|EQ}  threshold     op ∈ {Add, Subtract}
```
- `TraderPredicate = {threshold:i32, comparison: GreaterThan|LessThan|EqualTo}`
- `StatTerm = {statToProve:{key:u32,value:i32,period:i32}, eventStatRoot:[u8;32], statProof: ProofNode[]}`
- `statB:Option<StatTerm>`, `op:Option<{Add|Subtract}>` — both null ⇒ single-stat. Mismatch ⇒ `MissingSecondStat 6025` / `UnexpectedSecondStat 6026` / `InvalidStatCombination 6024` (TECH-REF §7).
- Soccer keys (TECH-REF §6a): `1/2`=goals, `3/4`=yellow, `5/6`=red, `7/8`=corners (odd=P1, even=P2). Period key `(period*1000)+base`: H1+1000…PE+5000.

**Line→threshold convention.** **All O/U and Asian-handicap markets** use `.5` lines mapped to strict integer thresholds, so a push/tie is **impossible on those markets**. `EqualTo` is used **intentionally and only** for inherently-discrete outcomes (1X2 Draw, exact total goals, clean sheet, exact scoreline). `Over N.5 → GreaterThan N`; `Under N.5 → LessThan N+1`. `value`/`threshold` are signed `i32`.

> **The risk ordering is inverted from intuition:** the proven mechanism is **single-stat** (`statB=null, op=null`, `validate-sim.ts:97`), so the "compound" BTTS (an AND of two single-stat CPIs) is **more proven** than 1X2 (which needs the never-succeeded two-stat path). The tiers below order markets by *mechanism risk*.

#### TIER 0 — v1 demo core (proven single-stat path; ships regardless of P0-d/P0-e)

Each market is a parimutuel YES/NO pool; YES wins iff the predicate is TRUE. Markets marked **(LT-proven)** are expressible with `LessThan` only — the exact mechanism already run on devnet — so they are the **demo floor** even if P0-c (GT/EQ) fails.

| Market | YES predicate | key | comparison | threshold | mechanism |
|---|---|---|---|---|---|
| **P1 clean sheet** (opponent fails to score) | `key2 < 1` | 2 | LessThan | 1 | **(LT-proven)** |
| **P1 fails to score** (under 0.5) | `key1 < 1` | 1 | LessThan | 1 | **(LT-proven)** |
| **P1 team total Under 2.5** | `key1 < 3` | 1 | LessThan | 3 | **(LT-proven)** |
| **P1 to score** (over 0.5) | `key1 > 0` | 1 | GreaterThan | 0 | + P0-c (GT) |
| **P2 to score** | `key2 > 0` | 2 | GreaterThan | 0 | + P0-c (GT) |
| **P1 team total Over 1.5** | `key1 > 1` | 1 | GreaterThan | 1 | + P0-c (GT) |
| **BTTS — showcase compound** | `(key1>0) AND (key2>0)` | 1, 2 | 2× GreaterThan | 0, 0 | compound, + P0-c (GT), + P0-i (2-CPI AND) |

BTTS is the hero **compound** market: two single-stat CPIs AND'd in `resolve()`, both fit under the 1.4M cap (2×~205k CU standalone leaves ample headroom for the wrapper; the wrapped total is a projection until P0-i). It is the recognizable sportsbook market that is also fully on the proven single-stat path. (If P0-i slips, BTTS drops to a single-stat demo via the §3.7 fallback — see scope ledger §3.8.)

#### TIER 1 — gated; ships only if its Phase-0 gate passes

**1a — two-stat `Add` (needs P0-d only; Add is commutative ⇒ operand order is irrelevant):**

| Market | statA | statB | op | threshold | comparison |
|---|---|---|---|---|---|
| **Total corners Over N** *(the brief's flagship example "TeamA + TeamB corners > 10")* | 7 | 8 | Add | N | GreaterThan |
| **Over total goals (e.g. 2.5)** | 1 | 2 | Add | 2 | GreaterThan |
| **Under total goals (e.g. 2.5)** | 1 | 2 | Add | 3 | LessThan |
| **Exact total goals (e.g. =2)** | 1 | 2 | Add | 2 | EqualTo |
| **Total yellow cards Over N** | 3 | 4 | Add | N | GreaterThan |
| **Red card in match (≥1)** | 5 | 6 | Add | 0 | GreaterThan |

**1b — two-stat `Subtract` (needs P0-d AND P0-e operand-order; a wrong order silently inverts the outcome):**

| Market | statA | statB | op | threshold | comparison |
|---|---|---|---|---|---|
| **1X2 — Home (P1) win** | 1 | 2 | Subtract | 0 | GreaterThan |
| **1X2 — Away (P2) win** | 1 | 2 | Subtract | 0 | LessThan |
| **1X2 — Draw** | 1 | 2 | Subtract | 0 | EqualTo |
| **Asian handicap P1 −1.5** (win by 2+) | 1 | 2 | Subtract | 1 | GreaterThan |
| **Asian handicap P1 +1.5** (`(P1−P2)≥−1`) | 1 | 2 | Subtract | −2 | GreaterThan |

> **Signedness + order:** away-win/handicap thresholds are negative; the `value:i32` type implies signed arithmetic, but **both** signedness and `A−B`-vs-`B−A` order are UNVERIFIED until P0-e. Tables above assume `A−B`; rewrite verbatim if P0-e shows `B−A`.

#### TIER 2 — period-keyed / in-play (deferred from v1)

H1/H2/HT markets (`key 1001/1002/2001/2002`, e.g. HT 1X2 = `Subtract(1001,1002)`, H1 Over 0.5 = `Add(1001,1002) GT 0`). **UNVERIFIED:** **no period-keyed bundle was ever fetched** — the leaf `period` a period key returns is unknown, and base `key 1` returned `period:7` (`validate-sim.log:15`, = the Game-Phase ID for **ET1** = Extra-Time first half, soccer-feed.mdx Game Phase Encoding), so the leaf `period` field carries a **game-phase ID, not a multiplier** (the ET1 *multiplier* would be 3000, not 7) and is **unpredictable**. Defer entirely; add "fetch a `1001`/`1002` bundle" to a stretch gate. (Deferring also resolves the in-play lock ambiguity — see §3.4: v1 locks every market at `StartTime`.)

#### Excluded — not expressible on-chain

| Market | Why | Handling |
|---|---|---|
| First/anytime scorer, player props | No player-level keys; tree carries only team totals 1–8 (soccer-feed.mdx) | **Exclude** from settlement; optional SSE-narrative display, no escrow |
| Shots / possession markets | `Possession` is in the live record (`probe-proofs4.log:13`) but is **not a keyed Merkle stat** | **Exclude**; show possession as ambient UI context only |
| Full correct-score grid | Each cell = a 2-CPI AND; a grid ≈ 25 markets | **Off-chain display** the grid; on-chain settle only individually-requested "exactly X–Y" cells (BTTS-style 2-CPI) |
| Man-of-the-match / subjective | No stat key, no Merkle leaf | **Exclude** |
| Regulation-only (90′) result in knockouts | Needs `P1reg=key1001+key2001` vs `P2reg=key1002+key2002` → a **4-stat** sum; `validate_stat` combines at most 2 | **Title constraint:** group/friendlies settle 1X2 on base keys at regulation; **knockout 1X2 must be defined as "result after extra time"** (base keys at FET). Document in the market title. ⚠ Note: base keys at FET exclude penalty-shootout outcomes — an ET draw decided on penalties settles as a Draw; state this in the title too |

> **Leaf `period` rule:** echo `bundle.statToProve.period` **verbatim** into the `StatTerm` — it is part of the Merkle-leaf preimage; recomputing it breaks reconstruction (empirically `7` for base key 1, `validate-sim.log:15`). This leaf `period` is a *different number* from §3.4's `marketScopePeriod` — see the §3.4 invariant.

---

### 3.3 Auto-generation pipeline (104 fixtures → catalog, lean on-chain footprint)

```
fixtures/snapshot ─▶ filter (SportId=1 Soccer; World Cup / Int-Friendlies CompetitionId)
              ─▶ per fixture: instantiate TIER-0 template set (+ TIER-1 if its gate passed)
              ─▶ resolve params (lines) ─▶ derive market_id + canonical title (§3.4)
              ─▶ EMIT OFF-CHAIN definition for ALL 104 fixtures (precomputed market_id)
              ─▶ MATERIALIZE on-chain create_market only for the demo/replay fixture(s)
```

- **Two-layer materialization (preserves the brief's flagship "Full-Tournament Auto-Market across 104 matches" while bounding rent):** generate the **complete 104-match catalog as off-chain definitions with `market_id` precomputed for every market**, and display it ("104 matches auto-generated, N materialized on-chain"). Only the demo/replay fixtures get on-chain `Market`+`Vault` accounts. This converts the rent hedge into the headline.
- **v1 template set per fixture:** TIER-0 set + BTTS. Add TIER-1a after P0-d, TIER-1b after P0-e.
- **Source of truth:** `StartTime` (ms), `Participant1/2Id`, `Participant1IsHome` — note `Participant1IsHome` is a **feed designation, not a venue guarantee** (TECH-REF §5); use it only to *label* Home/Away, **never** for settlement (settlement is purely P1/P2 keys).
- **Devnet reality:** the feed today carries only **Friendlies** (CompetitionId **430** confirmed-labeled `Friendlies` `probe-proofs2.log:14`; the live anchor fixture is CompetitionId **72**, whose name is **not** label-dumped in any log `probe-proofs4.log:13` — assume Int-Friendlies, confirm the label in P0). Live World Cup fixtures are **not** on devnet. The 104-match catalog is the *off-chain* artifact; the on-chain demo runs on a **cached friendly replay** (§3.7). Do not present live WC settlement as demoable.

---

### 3.4 Deterministic `market_id` — predicate-array binding (generalized for compound)

The draft's single-tuple preimage **cannot bind the compound markets it ships** (BTTS's second predicate is absent from the hash). Generalize to a length-prefixed predicate **array** + combinator + a `titleHash` so the on-chain `market_id` binds *every* sub-predicate **and** the human label:

```
preimage = "proofmarket:v1"
         || fixtureId           (i64 LE)
         || marketScopePeriod   (u16 LE)   // SEMANTIC scope: 0=full-game, 1000=H1, 2000=H2 …
                                            //   ⚠ this is NOT the leaf ScoreStat.period (see invariant)
         || combinatorCode      (u8)       // 0=single, 1=AND, 2=OR   (v1 uses 0 or 1)
         || N                   (u8)       // sub-predicate count (1 for single, 2 for BTTS)
         || for i in 0..N:                 // canonical order, low statKeyA first
              statKeyA_i (u32 LE) || statKeyB_i (u32 LE)   // statKeyB=0 if single-stat term
           || opCode_i (u8)               // 0=none,1=Add,2=Subtract
           || comparisonCode_i (u8)       // 0=GT,1=LT,2=EQ
           || threshold_i (i32 LE)
         || titleHash           (sha256 of the canonical title string)   // binds UI label == predicate
market_id  = first 8 bytes of sha256(preimage)            // u64
Market PDA = ["market",        market_id u64 LE]
Vault PDA  = ["market_vault",  market_id u64 LE]
```

- The `Market` account stores the **predicate array** `Vec<{statKeyA,statKeyB,op,comparison,threshold}>`, `combinator`, `marketScopePeriod`, and `title`. `resolve()` reads them back, CPIs `validate_stat` once per sub-predicate, and combines bools per `combinator`. Mirrors the shipped escrow PDA pattern `['escrow', tradeId u64 LE]` (TECH-REF §8) with `market_id` substituted for `tradeId`.
- **Title-binding (closes the create-time honesty gap):** the canonical title is produced by **one deterministic renderer** `predicate[] → string`, and its `sha256` is folded into the preimage. UI label == on-chain predicate **by construction**, so a creator cannot advertise predicate Y while storing predicate X.
- **Two-`period` invariant (prevents a silent Merkle-preimage corruption):** `marketScopePeriod` (e.g. `1000` for H1) is a *market-definition* field and enters **only** `market_id`. The leaf `ScoreStat.period` (e.g. `7`) is *runtime-echoed* from the bundle and enters **only** the `StatTerm`. **The leaf period MUST NEVER be derived from the market definition, and `marketScopePeriod` MUST NEVER be passed into a `StatTerm`.** Name them distinctly on the account (`marketScopePeriod` vs `leafPeriod`).

**Open/lock timing (v1 = pre-match only).** `Market.lock_ts = StartTime`. `deposit` rejects when `Clock::get().unix_timestamp >= lock_ts`. **All v1 markets lock at kickoff** (TIER-2 in-play markets are deferred), which removes the "stake after a goal is already on the board" integrity hole. State machine: `Open → Locked(at kickoff) → Resolved(after proof) → Claimable`, plus `Refundable` (the permissionless-timeout terminal state, §3.6).

---

### 3.5 Keeper Resolver — one-shot, cache-driven

For a replay-only demo there is **no live match to detect**; the v1 keeper is a one-shot `resolve(marketId, finalSeq)` over a **cached** bundle. Live SSE match-end detection (terminal-phase ID, 5-min root backoff) is a **stretch goal**, not v1 — it is only exercised by a live match that will not occur before judging.

```
1. INPUT  marketId, fixtureId, finalSeq      // from the cached replay definition (§3.7), or:
   (live, stretch) select the final seq from /api/scores/snapshot/{fixtureId}
        or /api/scores/updates/{fixtureId}   — NOT /api/scores/historical
        (historical serves only fixtures started 2 weeks–6h ago, TECH-REF §5 L100;
         a just-ended match is <6h old ⇒ outside the window. The spike's working path
         used /api/scores/updates intervals, validate-sim.log:12, never historical.)
   GATE: settle only on a Confirmed:true record (UNVERIFIED — see §3.6 / P0-g);
         in-play records carry Confirmed:false (probe-proofs4.log:13) — never settle those.

2. FETCH proof bundle  (v1: read CACHED JSON from disk; live: GET stat-validation)
     single-stat:  ...stat-validation?fixtureId=&seq=&statKey=K1
     two-stat:     ...&statKey=K1&statKey2=K2     (both at the SAME seq)   [TIER-1, P0-d]

3. DERIVE epochDay & PDA   (see §3.5a — one timestamp variable)
     epochDay = floor(bundle.ts / 86_400_000);  rootsPda = ["daily_scores_roots", epochDay u16 LE]
     getAccountInfo(rootsPda): null ⇒ root not yet published ⇒ BACKOFF (live only; cached root always exists)

4. BUILD resolve() args  (per sub-predicate; assembly mirrors validate-sim.ts:74-100 under the 1.5.2 IDL, P0-b)
     ts             = bundle.ts                                   (i64 BN)   // SAME var as the PDA seed
     fixtureSummary = { fixtureId:BN, updateStats:{updateCount, minTimestamp:BN, maxTimestamp:BN},
                        eventsSubTreeRoot: bundle.summary.eventStatsSubTreeRoot }   // RENAME, §3.1
     fixtureProof   = bundle.subTreeProof.map(ProofNode)
     mainTreeProof  = bundle.mainTreeProof.map(ProofNode)
     predicate      = Market.predicates[i].{threshold, comparison}   // FROM THE ACCOUNT, not recomputed
     statA          = { statToProve: bundle.statToProve,             // echo leaf period VERBATIM
                        eventStatRoot: bundle.eventStatRoot, statProof: bundle.statProof.map(ProofNode) }
     statB          = two-stat ? { statToProve: bundle.statToProve2,        // *UNVERIFIED shape, P0-d*
                        eventStatRoot: bundle.eventStatRoot2,               // *pure guess — confirm*
                        statProof: bundle.statProof2.map(ProofNode) } : null
     op             = Market.predicates[i].op   // {add:{}} | {subtract:{}} | null

5. SUBMIT resolve()
     Our escrow CPIs validate_stat (1 account daily_scores_merkle_roots = rootsPda) once per sub-predicate,
     reads each bool via sol_get_return_data (AQ==/AA==), combines per Market.combinator (single|AND|OR),
     sets Market.outcome → Resolved. Keeper is single fee-payer/signer; trustless per §3.0.
     ComputeBudget unit limit ≤1.4M (the examples' 10M only works in .view() sim, TECH-REF §7/§11).
     [P0-i degraded mode: if the custom CPI program is not ready, CLIENT-SIMULATE the proof to produce
      the receipt (step 6) — this alone is fully proven and is the honest floor. A real fund-move fallback
      via the shipped settle_trade is NOT a clean substitute: it needs a TradeEscrow set up via create_trade
      (3-signer, TxODDS-authority co-sign, UNVERIFIED callable — TECH-REF §8 L167), the exact dependency
      locked-decision #2 rejected; treat it as receipt-only unless a self-owned escrow lands. Single-predicate.]

6. EMIT the Resolution Receipt  ← the brief's "highly valued" Verifiable-Resolution artifact
```

#### 3.5 step 6 — the Resolution-Receipt contract (first-class output)

The keeper persists and emits a structured object; the resolution *signal lives in return data, not tx success* (both TRUE/FALSE succeed, `validate-sim.log:21-45`), so the receipt **must** surface the return byte and the per-stage program logs as the rendered chain:

```
ResolutionReceipt {
  marketId, fixtureId, combinator,                         // "single" | "AND" | "OR"
  subResolutions: [ {                                      // one per validate_stat CPI
    leaf: {key, value, period},                            // value=1, period=7 for the anchor
    eventStatRoot[32], eventsSubTreeRoot[32],
    statProof[], subTreeProof[], mainTreeProof[],
    dailyRootPda,                                          // ["daily_scores_roots", epochDay]
    dailyRootOnChain[32],                                  // FETCHED from the PDA — proves the real published root
    validateStatReturn: "AQ==" | "AA==",                   // THE resolution signal (0x01/0x00)
    stageLogs: ["Stage 1 Validation (Stat -> Event)",      // verbatim program logs (validate-sim.log:25-28)
                "Stage 2 Validation (Event -> Fixture)",
                "Predicate evaluated to: true|false"]
  } ],
  outcome: "YES" | "NO",  resolveTxSig,  ts,               // ts = bundle.ts (same var as PDA seed)
  // ── differentiation constants (the "No vote. No dispute window. Just math." payload) ──
  finalWhistleTs,  secondsFromFinalWhistle,                // latency stamp — vs UMA multi-hour reveal
  humanVotes: 0,                                           // vs betmoar/UMA 103 voters
  disputeWindowSeconds: 0,                                 // vs UMA dispute window
  proofsVerified: N                                        // 1 single / 2 compound — Merkle proofs, not votes
}
```

This single artifact resolves the two highest-value judging gaps at once: it **defines the contract the Proof Receipt UI consumes** (Code Quality), and it **emits the quantitative comparison data** (`secondsFromFinalWhistle`, `humanVotes:0`, `disputeWindowSeconds:0`, `proofsVerified:N`) that makes the differentiation *land* in a demo video — free, since the timestamps already exist.

#### 3.5a EpochDay pitfall — pick `ts`, be consistent
TECH-REF §7 flags the trap: docs derive scores epochDay from `summary.updateStats.minTimestamp`, the example uses top-level `ts`; a record straddling UTC midnight yields a **different day → wrong PDA → resolution fails**. **Decision (verified): use the bundle top-level `ts` for BOTH the `validate_stat` `ts` arg AND the PDA seed** — exactly what the spike did (`validate-sim.ts:63,97`), reconstructing to the live root (`validate-sim.log:18-32`). Invariant: *the timestamp passed as the arg and the timestamp deriving the PDA must be the same variable.* Never mix `ts` and `minTimestamp`.

---

### 3.6 Terminal-phase & integrity edge cases

| Case | Detection | Action |
|---|---|---|
| **No `resolve()` lands in time** (abandoned, postponed, keeper offline, or keeper malicious) | `Clock::now() > StartTime + MAX_MATCH_DURATION + GRACE` and `Market` still `Open/Locked` | **Permissionless timeout refund** (see below) |
| **Root not yet published** (live only) | `getAccountInfo(rootsPda)==null` | back off until the 5-min batch lands; only fetch the bundle *after* the final stat is anchored |
| **Stat correction** | `Confirmed:false` then later `true` | settle only on the final `Confirmed:true` seq — **UNVERIFIED, see below** |
| **Two-stat seq alignment** | both stats from one snapshot | single bundle call `statKey`+`statKey2` at the same `seq` |

**The Void hole — replaced with a permissionless, thesis-preserving mechanism.** A keeper-asserted `Voided` ("abandoned → refund, no proof") is a **trusted keeper action** that directly contradicts "No vote. No dispute window. Just math." — a judge will ask "what stops the keeper from voiding a market it dislikes?" and the answer would be "nothing" (worse than UMA, which at least has recourse). **Decision: there is no keeper-Void.** The only non-proof terminal state is a **permissionless timeout refund**: if no valid `resolve()` lands within `StartTime + MAX_MATCH_DURATION + GRACE`, **anyone** may call `refund()` → pro-rata return of stakes from the vault. No party can deny rightful winners (a real outcome is always settleable by *any* keeper via the public proof) and no party can seize funds (refund only returns each staker's own deposit). This keeps the keeper powerless — the entire thesis.

> **[OPEN — user decision: Void strength]** Default = permissionless timeout refund (above; simplest, fully preserves the thesis, ~0 extra trust). Optional upgrade = a **proof-backed void** — but **note `validate_fixture` cannot serve this**: the `Fixture` leaf carries only *identity/scheduling* fields (`ts, start_time, competition(_id), fixture_group_id, participant1/2(_id), fixture_id, participant1_is_home` — devnet.mdx:2310-2355) and has **no `StatusId`/status field**; the abandonment status (`A`=15 / `P`=19) lives in the *scores* record, not the Fixture snapshot. A proven void would therefore need a *different* artifact (e.g. a terminal scores-leaf proof), i.e. **+1 unproven proof path**, not a free `validate_fixture` call — stronger but +scope in a 19-day budget. Recommend the timeout for v1; flag the upgrade as a stretch differentiator only if a provable terminal-status leaf is found.

**`Confirmed:true` gate — UNVERIFIED.** Every record captured is `Confirmed:false` (`probe-proofs4.log:13`; all of `probe-proofs2`); we have **no evidence** a final record flips to `Confirmed:true`, nor on what cadence. P0-g must confirm a finished friendly carries `Confirmed:true`. **Fallback if it never flips:** settle on the last seq whose value is **stable across one 5-min root batch** AND whose `StatusId` is terminal — never a value that later changes.

**Terminal-phase detection — `StatusId`, not `GameState`.** The live record carries **both** `GameState:"scheduled"` (string) and `StatusId:7` (number) simultaneously, on a clearly-live extra-time clock (`Clock.Running:true, Seconds:5489` ≈ 91′; `StatusId:7` = ET1 in soccer-feed.mdx, consistent with ~91′) (`probe-proofs4.log:13`) — so `GameState` is unreliable and only the **numeric `StatusId`** carries the Game-Phase IDs (`F`=5 / `FET`=10 / `FPE`=13; soccer-feed.mdx). **UNVERIFIED:** no real *terminal* `StatusId` (5/10/13) was ever observed (the only sample is `StatusId:7`=ET1, mid-match), and TECH-REF warns *Game-Phase ID ≠ period multiplier* (§6a). P0-h must observe one real terminal record and confirm the field+values. For the v1 replay demo, **do not detect at all** — resolve over the fixed cached `finalSeq`. Drop `GameState` from any phase logic; cross-check `StatusId` with `Clock` stopping only in the stretch live path.

#### Data-integrity specifics (the `?-?` / cumulative fixes)
- **`?-?` fix (TECH-REF §6a):** current cumulative score is **two separate keyed stats** — `Stats["1"]` (P1) and `Stats["2"]` (P2) — not one combined "X-Y" field. Confirmed `Stats:{"1":1,"2":1,…}` (`probe-proofs4.log:13`). Display `P1=Stats[1]`, `P2=Stats[2]`; never string-parse a scoreline.
- **Totals are sums:** total goals = `Add(1,2)`, corners = `Add(7,8)`, yellows = `Add(3,4)` — never a pre-summed field.
- **`updateCount` type hazard:** `i32` in `ScoresUpdateStats` (confirmed devnet.mdx) vs `u32` elsewhere (TECH-REF §11) — decode as the IDL declares for `ScoresBatchSummary`.
- **Period stat may 404 before its phase exists:** `statKey=1001` before H1 has no leaf; fetch period stats only after that period is in the tree (TIER-2, deferred).

---

### 3.7 Demo / replay — honest framing, cache-backed, with a degraded-mode floor

All 104 matches finish before/around the Jul-19 deadline and judges test later (TECH-REF §12; brief: "matches may be over during review"), so the pipeline runs on **historical fixtures whose roots are already published**. This is *more* convincing, not less, because the Merkle proof and `validate_stat` CPI are **real** — but the framing must match what is actually proven.

- **Anchor (what is actually proven — corrected).** epochDay **20634**, fixtureId **18172280**, seq **1068**, statKey **1**, value **1**, leaf period **7** → live 200 bundle (`probe-proofs4.log:19-28`) reconstructing to the **existing** on-chain root `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` (`validate-sim.log:18`), `validate_stat` returning the correct bool both ways (`AQ==`/`AA==`). **This record is `Confirmed:false`, `GameState:"scheduled"`, clock running ~91′ with `StatusId:7` = ET1 (extra-time first half, soccer-feed.mdx) (`probe-proofs4.log:13`)** — i.e. a **non-final, unconfirmed mid-match value** (the score is not even regulation-final). It proves the **CPI mechanics** (proof reconstructs to a real root; return-byte resolution), **not a legitimate settled outcome**. Do **not** present seq 1068 as a settled result while §3.5/§3.6 forbid settling `Confirmed:false`.
  - **[OPEN — user decision: anchor]** (a) **Default:** P0-g captures a real finished-friendly `Confirmed:true` terminal bundle and we replay *that* as the legitimate-outcome demo; OR (b) if no finished scored friendly is available in the feed window before the deadline, demo on seq 1068 **explicitly reframed** as "the Merkle proof + CPI are real over a live match snapshot" and drop the "settle only final confirmed" claim from the *demo narrative* (keep it in production rules). Pursue (a); (b) is the honest floor.
- **Cache to disk — never depend on live API retention.** The root **PDA is permanent**, but `/api/scores/stat-validation` and `/api/scores/updates` retention is **unstated**, and `/api/scores/historical` only serves 6h–2wk-old fixtures (TECH-REF §5) — by judging (~29 days after epochDay 20634) the bundle may 404 mid-demo. **P0-g snapshots the full bundle JSON + the root-account bytes to disk;** the replay harness reads from cache, so a recorded demo cannot break on API aging.
- **Replay harness.** Retroactively generate a market for the cached fixture (same deterministic `market_id`), seed YES/NO pools with our **devnet test-USDC** mint (escrow is mint-agnostic, TECH-REF §8), then run the **real** `resolve()` against the cached proof, emitting the §3.5-step-6 receipt. The "Proof Receipt" UI renders the actual chain (stat leaf → `eventStatRoot` → subtree → daily root → `validate_stat` return byte → release) with the `humanVotes:0 / disputeWindow:0 / proofsVerified:N / secondsFromFinalWhistle` differentiation panel.
- **Degraded-mode floor (P0-a/P0-i fallback).** If the custom CPI escrow is not deployable by the deadline, the Proof Receipt still renders from the **client-side `.view()`/simulate** reconstruction (real root, real proof, real `AQ==`/`AA==` — already proven, `validate-sim.log`). **This receipt-only demo is the honest floor, and the hero UX survives a Section-2 slip.** **Caveat (do not over-promise the fund-move):** staging a *real* fund-move via the shipped devnet `settle_trade` is **not** a clean fallback — `settle_trade` requires a `TradeEscrow` first created via `create_trade` (3-signer, TxODDS-authority co-sign, **UNVERIFIED callable** — TECH-REF §8 L167), which is the exact dependency **locked decision #2 explicitly rejected**. If a self-owned escrow has not landed, present the floor as **receipt-only (no on-chain fund move)** rather than implying `settle_trade` is ready. (`settle_trade` is single-predicate anyway; BTTS would degrade to a single-stat demo.)
- **Live UI animation without a live match.** Replay `/api/scores/updates/{epochDay}/{hour}/{interval}` (e.g. `20634/3/1` → 50 records, `validate-sim.log:12`) through the SSE-shaped client to animate score/odds movement.
- **Fair-value baseline (stretch).** Overlay TxLINE implied prob next to parimutuel implied prob — display-only, gated on the §3.1 odds-encoding spike; never on the settlement path.

---

### 3.8 Scope ledger — what ships v1 vs stretch (19-day solo budget)

| Layer | v1 (ships) | Stretch / cut |
|---|---|---|
| **Markets** | TIER-0 (single-stat + BTTS), LessThan subset is the demo floor | TIER-1a (post P0-d), TIER-1b (post P0-e), TIER-2 period markets, exact-score grid |
| **Keeper** | one-shot `resolve(marketId, finalSeq)` over cached bundle | live SSE match-end detection + 5-min root backoff |
| **Generator** | full 104-match **off-chain** catalog (precomputed `market_id`) + materialize cached replay fixture(s) on-chain | 104-match lazy on-chain materialization |
| **Settlement** | custom `validate_stat`-CPI escrow (locked decision #2) **with** a client-simulate **receipt-only** degraded floor (NOT shipped `settle_trade` — that re-adds the TxODDS `create_trade` co-sign dependency decision #2 rejected, §3.7) | proof-backed void (needs a provable terminal-status leaf — `validate_fixture` cannot, §3.6) |
| **Trust** | permissionless timeout refund; predicate+title bound in `market_id` | — |
| **TxLINE flourish** | scores as the hard settlement input | odds-decode fair-value overlay (display-only) |

Cut for v1: odds fair-value overlay, in-play H1/H2 markets, exact-scoreline grid, compound markets beyond BTTS. The result is fully on the proven single-stat + cached-replay path, with the "Proof Receipt" hero and the "No vote / no dispute / just math" differentiation intact, and every above-floor market behind an explicit Phase-0 gate.

---

## Section 4 — UX & Proof Receipt Hero

> Grounding: TECH-REFERENCE §5 (data APIs), §6a–c (data models), §6b (odds ×1000 / data-feed encoding UNVERIFIED), §7 (proof chain + PDA seeds + return semantics + epochDay hazard), §8 (settlement + "the genuine gap"), §10 (toolchain absent), §11 (decoder hazards), §12 (judges test free); HACKATHON-BRIEF L16 (data free during event; devnet=SL1 60s per §2/§4), L12 (TxLINE primary + mockups/wireframes auto-DQ), L13 (matches may be over during review), L14 (deployed site + endpoint docs), L17 (live interview), L28/L33 (Verifiable Resolution UI — "highly valued"), L31 (smart contracts **CPI into `validate_stat`** — *the* Track-1 ask), L35 (judging: Core Functionality · UX & Use Case · Code Quality & Logic). File-verified from the live spike: proof-bundle 7-key shape (`probe-proofs4.log:21`) + `{key:1,value:1,period:7}` leaf (`probe-proofs4.log:23`); daily-root PDA `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` **EXISTS** on devnet (`validate-sim.log:18-19`); `validate_stat` sim TRUE→205264 CU / return `AQ==`, FALSE→205266 CU / return `AA==`, return-data log `Program return: 6pW64g…wyP2J AQ==` and `Program log: Predicate evaluated to: true` (`validate-sim.log:22-44`); PDA derivation `["daily_scores_roots", epochDay u16 LE]`, epochDay=20634 (`validate-sim.ts:63-67`).
>
> **Load-bearing caveat the whole section is built around:** every `validate_stat` artifact above was produced by `connection.simulateTransaction(...)` (`validate-sim.ts:103`), **not** a confirmed `.rpc()` transaction, and `validate_stat` was the **top-level callee** in the spike (not yet an inner CPI). No settle tx, escrow vault, or payout transfer exists on devnet yet. BRIEF L12 auto-disqualifies mockups — so the hero is re-architected to stand on **one real, permanent on-chain artifact captured in Phase 0** (§4.11A) rather than on the unbuilt full escrow program.

### 4.0 Design thesis (the spine every screen serves)

The single differentiating claim is **"No vote. No dispute window. Just math."** Every screen serves one moment: a judge clicks a *resolved* market and watches USDC move because a Merkle leaf folded up to an on-chain root and **our escrow program's CPI into `validate_stat` read `true`** — no human, no quorum, no challenge timer. The contrast (betmoar.fun / Polymarket-UMA) is rendered **on the same screen, at the same scale**, as the losing side of an A/B; the contrast *is* the pitch (LOCKED DECISION 4).

Two judging hooks are cheap and under-claimed in the prior draft, and this revision elevates both because the brief rewards them most:
1. **The CPI nesting itself** (BRIEF L31 — the explicit Track-1 differentiator). The receipt's thesis is **"ProofMarket escrow → CPI → `validate_stat` → bool → gate release."** betmoar/UMA structurally *cannot* show this. The prior draft rendered `validate_stat` as if it were a top-level call; it is now rendered as a nested, fund-gating inner instruction.
2. **Client-side fold re-computation** (BRIEF L28/L33 — "highly valued"). This converts Steps 1–3 from "trust our animation" into "your browser recomputed the same root Solana stores." It is promoted from a decorative stretch goal to a **Phase-0 must-try** (§4.11A), because it is reverse-engineerable from the real bundle in an afternoon.

Design principle for a solo builder in ~19 days: **four screens, one load-bearing.** Screens 1–3 are betmoar-grade table stakes assembled from a kit; Screen 4 gets the disproportionate budget. And honesty is part of the pitch: the section states the one tradeoff a sharp judge will raise in the live interview (BRIEF L17) — **ProofMarket can only resolve predicates over the objective stats TxLINE signs** — and turns it into the thesis (§4.7) rather than leaving it exposed.

### 4.1 Frontend tech stack (recommendation + justification)

| Layer | Choice | Why (not a generic default) |
|---|---|---|
| Framework | **Next.js 14 (App Router) + React 18 + TypeScript** | Route Handlers double as the **auth proxy** holding the two TxLINE headers server-side (§4.1a). One `vercel deploy` gives judges a URL (BRIEF L14). |
| Styling | **Tailwind + shadcn/ui (Radix)** | Accessible Dialog/Tabs/Tooltip/Card/Sheet for free → Screens 1–3 are assembled, not authored. Spend saved time on Screen 4. |
| Wallet | **@solana/wallet-adapter-react + -react-ui** (Phantom/Solflare) **+ built-in burner fallback** | Judges may lack a devnet wallet; the burner (in-browser `Keypair`, localStorage) = zero-install play (§4.8). |
| On-chain client | **@coral-xyz/anchor + @solana/web3.js ^1.98** | Client-side TS is the part of the toolchain that *works today* (§10). **[OPEN — user decision: pin anchor to the version the deployed program is built with once §10's 0.30.1↔0.31.1 reconciliation lands; client/program IDL parity must match the actual build, not package.json.]** |
| Server data | **@tanstack/react-query** (interval polling + cache) | Pool sizes are Solana account fetches; odds/scores are **snapshot polls** (§4.1a). Handles refetch-on-interval, stale states, optimistic updates after a stake tx. |
| Light client state | **zustand** | Selected market, replay clock, burner keypair. No Redux ceremony for a solo build. |
| Proof rendering | **framer-motion (light)** | Stagger + one "fold" highlight pulse on the **static step cards** (§4.6) — *not* a bespoke animated Merkle canvas (cut per feasibility; see §4.11). |
| Charts | **Recharts** | Pool-split bars + the (scoped) parimutuel-vs-TxLINE gauge (§4.3). Faster to ship than visx. |
| Hashing (Phase-0 spike) | **@noble/hashes (keccak256 + sha256)** | For the **fold re-compute** (§4.6, §4.11A). Promoted from decorative to highest-ROI Phase-0 item: reverse-engineer the hash fn from the real `{1,1,7}` leaf + `statProof[6]` + target `eventStatRoot`. |
| Deploy | **Vercel free tier** | Instant public URL. Short request/response Route Handlers only — **no long-lived streaming** (§4.1a). |

**Out of scope on purpose (solo, ~19 days):** persistent SSE streaming, a full animated Merkle-tree canvas, client SSR of on-chain state, design system beyond shadcn, mobile-native (responsive web only), i18n.

#### 4.1a Auth proxy via short-lived snapshot polling (was: persistent SSE proxy)

`EventSource` cannot set request headers, and every TxLINE call needs **both** `Authorization: Bearer <jwt>` **and** `X-Api-Token: <apiToken>` (TECH-REFERENCE §3, §5). So the browser must not talk to `txline-dev.txodds.com` directly. **But the prior draft's persistent SSE re-stream through a Vercel Route Handler is a deployment footgun** (serverless/Edge execution-duration caps kill long-lived streams) **and unnecessary**: real WC fixtures are future-dated, BRIEF L13 says matches may be over during review, and devnet is SL1-only = ~60s-delayed (§4) — so the demo runs on **Replay** (§4.10), not a live stream. The "live pulse dot" oversold a 60s-stale feed.

**Revised design:** a Next.js Route Handler holds both tokens server-side and exposes **short request/response endpoints** that react-query polls on an interval:
- `GET /api/txline/odds/snapshot/[fixtureId]` → proxies `/api/odds/snapshot/{id}`, applies the docs' standard parser server-side (sidestepping the broken `Message:` parser, §11), optional `Accept-Encoding: gzip` + `gunzipSync` (~70–80% bandwidth cut, §5), re-emits clean JSON.
- `GET /api/txline/scores/snapshot/[fixtureId]` → proxies `/api/scores/snapshot/{id}` for in-play clock + current `Stats{}`.
- `GET /api/txline/proof/[fixtureId]?seq=&statKey=[&statKey2=]` → proxies `/api/scores/stat-validation` (the Proof Receipt bundle).

Tokens never reach the client; no stream to keep alive on Vercel; same react-query layer serves live (poll) and replay (recorded JSON) behind one interface (§4.10).

### 4.2 Information architecture / route map

```
/                      → Market List (Screen 1, default)
/m/[marketPda]         → Market Detail (Screen 2)
/m/[marketPda]/receipt → Proof Receipt Hero (Screen 4)   ← deep-linkable, the demo URL
/portfolio             → Positions + Claim (Screen 3)
/replay/[fixtureId]    → Replay Mode (§4.10): scripted Screen 2 → Screen 4
   global: <WalletButton/> + <FaucetButton/> + persistent "Replay demo" CTA
```

**`/m/[pda]/receipt` pre-settlement state (fix R3#9):** during live judging most markets are *open*, so a bare `/receipt` would be blank. Pre-settlement, the route renders the **static "How resolution works" explainer + a CTA into `/replay`** (which links a real, already-settled artifact). The headline demo URL is therefore never empty.

### 4.3 Screen 1 — Market List (betmoar-grade)

**Layout:** sticky filter bar (All / Live / Upcoming / Resolved · group-by-match) over a grouped, virtualized list. **Group header = fixture**, rendered from the fixtures snapshot: team *names* resolved from `Participant1Id/Participant2Id` (NOT hardcoded), `Competition`, `StartTime` (§6c) — e.g. `<Team A> vs <Team B> · <Competition> · kickoff in 2h14m` with flags. Market rows nest under each header.

**Twin-bar — scoped honestly (fix R2#3, R3#5):** the signature "parimutuel vs TxLINE fair value" twin-bar **only renders where TxLINE actually quotes a matching offer.** The live feed carries **standard match-level markets only** — `1X2_PARTICIPANT_RESULT`, `OVERUNDER_PARTICIPANT_GOALS`, `ASIANHANDICAP_PARTICIPANT_GOALS` (observed in `live-now.log`). There is **no corners/generic-prop offer**, so the fair-value bar is empty for parametric props. Therefore:

| Field | Source & formula |
|---|---|
| Predicate (plain language) | Authored at Market-Gen time; rendered by `predicateToText()` (§4.4) from the authored label, never decoded from the leaf. |
| **Parimutuel implied P(YES)** | `P_yes = Y / (Y + N)`, `Y`=YES pool, `N`=NO pool, both USDC base units (6-dp) from the on-chain pool PDA. |
| **TxLINE fair-value P(YES)** *(priced markets only)* | From the polled odds snapshot. Candidate decode `P_fair = 1000 / oddsField` (offer decimal×1000, §6b) **OR** `Odds.prices[i]` indexed by `Odds.price_names[i]`. **UNVERIFIED — data-feed `prices[]` units not in repo (§6b); no decode was attempted in the spike. Phase-0 must inspect a real `/api/odds/snapshot` payload (§4.11A).** Note §6b: `StablePrice` is **de-margined**, so `1/decimal` ≈ true probability once decoded — good for the fair-value framing. Label "indicative" until verified. |
| **Edge / mispricing** *(priced markets only)* | `Δ = P_yes − P_fair`, colored chip ("+6.2% vs fair"). The TxLINE-native flourish. |
| **In-play progress** *(prop markets, the verified substitute)* | For props with no TxLINE quote (e.g. corners), show **live progress toward the threshold** from the scores snapshot `Stats{}` — e.g. "corners 12 / threshold 10" (key 7 + key 8, file-verified `Stats:{"7":5,"8":7}`, `probe-proofs4.log:13`). This is a *verified* signal, replacing a fabricated "edge vs fair." |
| Volume / liquidity | `T = Y + N` USDC (`$1,240`). |
| Time-to-lock | Countdown to `StartTime`. At lock → "Awaiting result"; after settle → green **"Proof ✓"** badge → `/receipt`. |

**Visual spec:** a horizontal twin-bar per *priced* row — top bar filled (parimutuel P(YES)), bottom bar outline (TxLINE fair). The gap reads as the "edge," making the product feel *quant*, not casino. Prop rows show the in-play progress meter instead.

**States:** loading skeletons; empty ("No live markets — try Replay demo →"); resolved markets collapse into a "Settled" section carrying **Proof ✓**.

### 4.4 Screen 2 — Market Detail

**Header:** fixture (real team names), market title, lock countdown, status pill (Open / Locked / Resolved).

**Predicate in plain language — settlement-safe rewrite (fix R1#4, R2#4).** Rendered by a pure function over the **authored** market definition, *not* by decoding the leaf's `period`:

```
predicateToText({ label, statA, statB, op, predicate }):
  // `label` is FREE TEXT authored at Market-Gen — it is the human source of truth.
  // statA/op/predicate drive the math; they are NOT reverse-mapped to phrasing.
  key→stat:   1→"P1 goals" 2→"P2 goals" 3/4→"yellow cards" 5/6→"red cards" 7/8→"corners"  (§6a)
  op Add + key 7 + key 8 → "total corners"
  comparison GreaterThan, threshold 10 → "> 10"
  ⇒ render the authored `label`, e.g. "Total corners (full match) > 10"
```

**Why no `period()` map:** the prior draft's `0→full · 1000→1st half · 2000→2nd half` was **miscited to §6a and settlement-unsafe.** §6a's `(period*1000)+base` multiplier is baked into the **key** (P1-H1-goals = key **1001**), not a standalone `period` field, and §6a warns "Period-multiplier index ≠ Game-Phase ID" (H1 = Game-Phase ID **2**, not 1000). The live leaf proves it: `statToProve.period:7` (`probe-proofs4.log:23`) matches neither `0` nor a ×1000 multiplier — it *coincides with* the record's `StatusId:7` (`probe-proofs4.log:13`) — i.e. an encoding unrelated to game-phase semantics (single-sample correlation, not confirmed). **Critically, for `validate_stat` to return TRUE the `ScoreStat{key,value,period}` we pass must byte-match the published leaf** — so Market-Gen's `period` is *not* free; it must equal whatever `/api/scores/stat-validation` emits for that key/phase. **[OPEN — user decision deferred to Phase-0 task §4.11A: confirm the exact `ScoreStat.period` the endpoint returns per statKey/phase before authoring any half/period-scoped market.]** Until then, ship only **full-match** markets where the captured leaf's `period` is known to settle (the captured `{1,1,7}` does).

**Pool breakdown:** twin-bar at full size; pools `Y`, `N`, total `T`; your position highlighted. **Live parimutuel multiplier:**
- YES wins: `payout_per_unit = D / Y`, `D = T·(1 − f)`, `f` = protocol fee (e.g. 200 bps). Shown e.g. **"1.85×"**. NO wins: `D / N`.
- Caption: "Parimutuel — your multiplier finalizes at lock." (Honesty = Code-Quality/UX credibility.)

**Stake panel:** USDC amount, YES/NO toggle, live preview ("Stake 50 → if YES, you claim ≈ `stake·D/Y` = 92.5 USDC"), single `stake` tx (Section 2), optimistic `Y`/`N` update reconciled on confirmation, explorer link to the tx.

**Resolve vs claim — make the lifecycle honest (fix R1#2).** A parimutuel pool can have many winners; `validate_stat` alone is ~205k CU (`validate-sim.log:30`) and an N-winner payout fan-out does **not** fit one tx. So the two-phase model is explicit:
- **`resolve` (one tx, transfer-free):** escrow CPIs `validate_stat`, reads the bool via `sol_get_return_data`, flips market→`Resolved`, records `winningSide`. Keeping it transfer-free also lets the inner txoracle return data survive in tx meta as a bonus (§4.6 Step 5).
- **`claim` (per-winner pull):** each winner withdraws `stake_i · D / W` (`W` = winning pool) in their own tx.

**[OPEN — user decision: auto-distribute vs pull-claim.** Pull-claim is CU-safe and is what Screen 3/Step 6 are designed around. If Section 2 instead auto-distributes to a small capped winner set, Screen 3 becomes a read-only "Auto-paid ✓" link. Decide before freezing the pool IDL (§4.11A).]**

**Trust strip (always visible):** "This market settles by our escrow's **CPI into `validate_stat`** on Solana — not by a vote." + "How resolution works →" linking the explainer/receipt preview. Names the endpoint/program for the BRIEF-L14/L36 provenance gate (§4.6).

### 4.5 Screen 3 — Portfolio / Positions + Claim

Tabs: **Open** (live positions, implied P&L) and **Settled** (predicate, side, won/lost, staked, claimed, **"View Proof Receipt" →** Screen 4). Header strip totals staked / in-play / claimable / claimed. **Claim** triggers the per-winner `claim` instruction (pull model, §4.4); if Section 2 auto-distributes, this degrades to read-only "Auto-paid ✓ — `tx`". Empty state routes to Replay so the screen is never blank for a judge.

### 4.6 ★ Screen 4 — Proof Receipt Hero (the centerpiece)

A **vertical stack of six static "resolution-chain" step cards** — *not* a bespoke animated Merkle canvas (cut per feasibility R2#7; the canvas was the only non-shadcn-shortcut component, ~3–5 solo days, and §4.6's own trust model says the **links, not the animation, are the proof**). On load, framer-motion staggers the cards in and pulses one "fold" highlight per step; a "Replay animation" button re-runs it. **Every step links to an immutable on-chain or file-verified artifact** so a judge verifies on Explorer, not by trusting our UI.

**Faithful to the captured data (fix R1#3, R2#4).** The flagship demo market is **single-stat** — matching the only bundle the spike actually captured (`statKey=1`). The two-stat "Total corners > 10" market is rendered in the list/predicate-text demo but is **not** the animated receipt unless Phase-0 captures a real `&statKey2=` bundle (its envelope — `statProof2`/`eventStatRoot2` vs a different shape — is UNVERIFIED; the spike never fetched one). **[OPEN — user decision: invest a Phase-0 day to capture + design a two-leaf branched fold for the corners marquee, or keep the animated hero single-stat and demo corners only as predicate text. Recommendation: single-stat hero — it is byte-faithful to the verified bundle and the corners total (12) on this fixture happens to satisfy `>10` if you later want it.]**

**The flagship leaf (real, not fabricated — fix R1#7, R2#4):** fixture **18172280**, `statToProve = {key:1, value:1, period:7}` (`probe-proofs4.log:23`). `key:1` = **Participant-1 goals** (§6a); teams resolve from `Participant1Id 2161 / Participant2Id 2530` via the fixtures snapshot — render the *actual* resolved names (this is synthetic devnet data, **not** "Brazil vs Argentina"; fall back to "Participant 1 goals" if a name is unavailable). Human line: *"<Participant 1> goals = 1."*

**The six step cards:**

| # | Step | Renders (real, file-verified fields) | Inspect link |
|---|---|---|---|
| 1 | **Stat leaf** | `{key:1, value:1, period:7}` → "<P1> goals = 1." Shown as a hashed chip. **No period prose** (period encoding UNVERIFIED — show `key→goals, value→1` only). | Raw-JSON drawer |
| 2 | **leaf → eventStatRoot** | `statProof[6]` (`probe-proofs4.log:26`). Each `ProofNode = {hash:[u8;32], isRightSibling:bool}` placed left/right per `isRightSibling`, folding to `eventStatRoot` (head `[112,180,31,30,3,89]`, `probe-proofs4.log:24`). **Illustrative schematic** + raw values verbatim (see "honesty" below). | Raw drawer |
| 3 | **eventStatRoot → fixture sub-tree root** | `subTreeProof[6]` folds up to `summary.eventStatsSubTreeRoot` (`[249,76,119,244,…]`, `probe-proofs4.log:25`). Caption: `summary.fixtureId=18172280`, `updateStats.updateCount=50`. | Raw drawer |
| 4 | **fixture sub-tree → daily root (on-chain PDA)** | `mainTreeProof[1]` folds the fixture subtree toward the daily scores root, stored at PDA `seeds=["daily_scores_roots", epochDay u16 LE]`. **The UI *links* the stored root account; it does not claim to have recomputed it** (fix R1#6 — recompute lives only in the optional toggle below). | **Explorer → daily-root PDA `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe?cluster=devnet`** — **verified EXISTS** (9232B, owner `6pW64g…`, `validate-sim.log:18-19`). |
| 5 | **escrow → CPI → `validate_stat` → bool** (the star) | Renders the **nesting** explicitly: *ProofMarket escrow (outer) → inner CPI → `validate_stat` → `true` → gate release.* Surface the **inner-program log line** `Program log: Predicate evaluated to: true` and the inner `Program return: 6pW64g…wyP2J AQ==` **parsed from the inner-instruction logs keyed to program `6pW64g…`** — **NOT** `tx.meta.returnData` (which reflects the *outer* escrow instruction, likely empty/0x01-from-our-program; fix R1#1, R2#2, R3#3). Logs are not cleared by subsequent CPIs and survive on Explorer's inner-instruction view. Bonus: because `resolve` is transfer-free (§4.4), the txoracle `AQ==` may also survive in tx meta — link it only if Phase-0 confirms it does. | **Explorer → the real settle tx `tx/<sig>?cluster=devnet`** (captured Phase-0, §4.11A), jump to inner instructions / program logs. |
| 6 | **→ escrow release (per-winner claim)** | Re-framed from "auto-release of the whole pool" to **each winner pulls `stake_i · D / W`** (`W`=winning pool, `D=T·(1−f)`; fix R1#2). Render the SPL transfers from the escrow vault PDA to the **same burner wallets that staked** (fix R3#8 — real end-to-end, see §4.10). Until Section 2 ships, this card shows a labeled **"pending — settles once the escrow program deploys"** state so the submission is never a mockup (BRIEF L12). | **Explorer → escrow vault PDA + each claim transfer** (once §4.11A captures them). |

**Provenance footer on every card (fix R3#10):** each step names its source — `/api/scores/stat-validation`, program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`, the daily-root PDA — which doubles as visible proof of the BRIEF-L12/L14/L36 "TxLINE as primary live source + documented endpoints" screening gate.

**JSON → Anchor adapter note (fix R1#8):** the bundle "renders field-for-field," but JSON keys ≠ on-chain struct fields and the UI must map, not leak, them — `eventStatsSubTreeRoot` → Anchor `eventsSubTreeRoot` (`validate-sim.ts:88` does exactly this rename); JSON `subTreeProof` is passed as the **arg `fixture_proof`** (`validate-sim.ts:79,97`; devnet.mdx:1555) — never surface "subTreeProof" beside a control labeled `fixture_proof`; `ScoresUpdateStats.update_count` is **`i32`**, not u32 (devnet.mdx:2914; §11).

**Optional "Verify in your browser" toggle — promoted to Phase-0 must-try (fix R3#6).** Only the *final* daily root is on-chain; `eventStatRoot` and `eventStatsSubTreeRoot` live only in the off-chain JSON, so without recompute, Steps 1–3 ask the judge to trust the schematic. The fix is the highest-ROI bonus in the whole build: in Phase 0 (§4.11A), reverse-engineer the hash fn from the real artifacts you already hold — leaf `{1,1,7}`, `statProof[6]`, target `eventStatRoot [112,180,31,30,3,89,…]` — by trying keccak256/sha256 over the serialized leaf, folding per `isRightSibling`, and checking equality to the published root, then chaining to the **EXISTS** PDA root. If it reproduces, "your browser recomputed the same root Solana stores" is a far stronger judge moment than a link, and Steps 1–3 become independently verifiable. **Note a real anomaly to resolve first:** in the captured bundle `eventStatRoot` head `[112,180,31,30,3,89]` equals `subTreeProof[0].hash` head (`probe-proofs4.log:24` vs `:27`) — the chaining is not as clean as a naive 6-step narrative implies; verify the actual fold order before scripting it. If the spike fails to nail the hash fn, ship Steps 1–6 with the fold marked **illustrative ("schematic of the proof structure")**, raw bundle bytes shown verbatim, and let the **on-chain `validate_stat` result the tx already verified** be the single authoritative claim (fix R2#9).

**Why this is trustworthy even without UI recompute:** the receipt *links* each abstract step to a concrete immutable artifact (the EXISTS daily-root PDA, the settle tx's inner `validate_stat` log/return, the escrow transfers) — it does not *assert*. A malicious keeper can't fake it: a wrong proof makes `validate_stat` return `false`, the escrow gates the release on that bool, and no funds move (ARCHITECTURE layer c).

### 4.7 The UMA / Polymarket contrast card — reframed around trust model (fix R3#7)

A split-screen **"How others resolve"** panel pinned right (desktop) / below (mobile) the receipt, styled as a deliberately *anxious* card against our calm green chain. **Leads with the trust model, not turnout theater** (which invites "cherry-picked"):

| ProofMarket (left, green) | Polymarket-style optimistic oracle (right, amber/red) |
|---|---|
| **Correct by construction** — cryptographic proof | **Correct by economic incentive** — + dispute game |
| Deterministic: TRUE/FALSE from a signed stat | Subjective-capable: depends on voter turnout & honesty |
| Escrow **CPIs `validate_stat`**, gates funds on the bool | Resolution = a vote that **can be wrong if undisputed** |
| **Resolves in 1 proof tx**; no challenge window | **Multi-hour commit/reveal** + dispute → re-vote / escalation |
| *(illustrative, per betmoar.fun: 103 voters / reveal window / dispute risk)* | turnout numbers shown small, as the model's mechanics — not a benchmark |

**Own the tradeoff (the line that survives the live interview, BRIEF L17):** a full-width footer states it plainly — *"An optimistic oracle can resolve any subjective question; ProofMarket resolves only predicates over the objective match stats TxLINE signs. For 'how many corners,' you don't need 103 people to vote."* This sharpens, rather than dodges, **"No vote. No dispute window. Just math."** Note the prior "Settles in 1 tx (~205k CU)" claim is **dropped** — ~205k CU is `validate_stat` alone (`validate-sim.log:30`), not the escrow-CPI+resolve total — replaced by the defensible "Resolves in 1 proof tx." Static content; near-zero build cost.

### 4.8 Wallet / onboarding (devnet, free for judges)

Constraint: judges test free, no purchases, devnet-friendly (§12; BRIEF L16). Two paths:
1. **Bring-your-own wallet:** wallet-adapter modal (Phantom/Solflare) + a mainnet-detect banner ("Switch to Devnet").
2. **Zero-install burner (default for judges):** **"▶ Play as guest"** generates an in-browser `Keypair` (localStorage, "Burner wallet — devnet, throwaway"). No extension, no seed phrase.

**Funding — invert the prior SOL-faucet risk (fix R2#8, R3#11).** A public Route Handler dispensing SOL from a server hot-wallet is attack surface and an ops liability (an empty faucet during open judging = Core-Functionality fail), and devnet airdrop is flaky (own risk). Revised:
- **Pre-fund a small pool of burner keypairs** with SOL+USDC ahead of judging; **"Play as guest" hands the judge one** — staking in seconds, **zero server round-trips on the hot path.**
- **USDC is the headline, abuse-cheap path** — we own the mint authority (LOCKED DECISION 2). `/api/faucet/usdc` mints e.g. **1,000 test USDC** to the judge's ATA (creating it if absent), **throttled per-pubkey/IP**. CTA: "Get 1,000 test USDC."
- **SOL only on demand:** the USDC faucet forwards ~0.01 SOL **only when the wallet's SOL balance is 0**; `requestAirdrop` is a last-resort fallback if the pre-funded pool depletes. No standalone public SOL faucet endpoint.

Navbar shows live SOL + USDC balances. Whole flow is on devnet, free, **no TxL** (forbidden for wagering — BRIEF L29, LOCKED DECISION 2).

### 4.9 How the ≤5-min demo video showcases the hero

The video must *carry the product* (matches may be over during review, BRIEF L13). Budgets:
- **0:00–0:30 — Hook (trust model).** UMA contrast first: "Polymarket resolves by people voting, with reveal windows and disputes. Watch a market resolve by math instead." Tagline on screen.
- **0:30–1:30 — List + Detail.** Scroll the list; pause on a **priced** market's twin bar ("the crowd says 61%, TxLINE's live fair value 55% — there's the edge") — *not* on a prop, which has no fair bar. Open the flagship, stake 50 USDC, show tx confirm + explorer link.
- **1:30–2:00 — Funding once.** "Get 1,000 test USDC" so judges know it's free + reproducible on devnet.
- **2:00–4:00 — THE HERO (~40% of runtime, by design).** Trigger settlement (Replay → the captured real tx). The six step cards reveal: leaf `{key:1,value:1}` → eventStatRoot → fixture subtree → **daily-root PDA `BcLwqH…` (click → Explorer, EXISTS)** → **escrow CPI → `validate_stat` → log "Predicate evaluated to: true" / inner return `AQ==` (click → Explorer inner instructions)** → **per-winner claim, USDC lands in the same burner (click → Explorer)**. Narration foregrounds the **nesting**: "Our escrow program called `validate_stat` as an inner instruction, read `true`, and *that bool* released the money. No vote. No dispute window. Just math."
- **4:00–4:45 — Side-by-side payoff.** Green chain + amber UMA card together; restate the three hooks (it works = Core Functionality; this is the UX = UX & Use Case; here's the **CPI** = Code Quality & Logic, BRIEF L31).
- **4:45–5:00 — Close:** deployed devnet URL + "test it yourself, free."

### 4.10 Replay mode (works after matches end) — now genuinely end-to-end

Devnet roots + the settle tx are permanent, so replay re-narrates *real* artifacts. **The prior draft's "seeded fake stakes" contradicted "nothing is mocked at the trust layer" (fix R3#8) — removed.** Instead, the recorded fixture is a **genuine end-to-end capture**: real burner wallets really stake, the real `resolve` tx really runs the CPI, and the real `claim` txs pay **those same wallets** — so the wallets filling the pools *are* the wallets in Step 6's Explorer transfer links. We own the USDC mint, so funding the burners is free (§4.8); one devnet afternoon converts "believable" into "actually real," which *is* the product.

**What the replay fixture JSON ships with:**
- The recorded **scores timeline** (`Seq`, `Ts`, `Clock.Seconds`, `Stats{}` — `probe-proofs4.log:13`) for clock scrubbing.
- The **real proof bundle** (the 7-key object, `probe-proofs4.log:19-28`).
- The **real on-chain `resolve`/settle tx signature** + the **EXISTS** daily-root PDA, so every Explorer link resolves to a live devnet artifact.
- The **real burner stake + claim txs** from the genuine end-to-end run.

**Behavior:** `/replay/[fixtureId]` plays Screen 2 (pools grow, fair-value line moves on priced markets / progress meter advances on props, clock ticks to FT) then auto-advances into the Screen 4 hero whose links point at the already-settled real tx. A judge in August still sees the full resolution, every link verifiable on Explorer.

**Build cost:** low — same components, driven by recorded JSON behind one interface: `useMarketFeed(live | replay)` so live and replay share 100% of the UI.

### 4.11 Build plan — Phase 0 program gate first (fix R2#5, R3#1)

The prior plan budgeted **zero days for the program the frontend sits on** and front-loaded program-gated work (pool-PDA hooks, stake tx) into Week 1. For a solo builder who *also* owns Section 2, the program is the critical path: toolchain install + 0.30.1↔0.31.1 reconciliation + first-ever CPI + `sol_get_return_data` (§10, §8 "the genuine gap") is a multi-day-to-week effort with real failure risk.

#### 4.11A Phase 0 — de-risk before any frontend (the hard gates)
1. **Toolchain:** install `solana` CLI / `cargo-build-sbf`, reconcile anchor to the version the program will deploy with; deploy even a **stub** escrow program and **freeze the pool account IDL/layout** (so Screens 1–3 can be built against it).
2. **Capture ONE real, permanent devnet artifact (the hero's foundation, fix R2#1/R3#1):** land a **standalone `validate_stat` `.rpc()` tx now** — client TS works today, the daily root already EXISTS (`BcLwqH…`), and this gives Steps 1–5 an immutable, inspectable artifact **independent of the escrow program.** Then, as the escrow lands, capture the **real `resolve` (CPI) tx + per-winner `claim` transfers** as the first replay fixture. **No video is recorded until at least the standalone `validate_stat` tx exists** (BRIEF L12 mockup DQ).
3. **Return-data spike (fix R1#1):** confirm exactly where the bool surfaces in *your* CPI instruction layout — inner-instruction log keyed to `6pW64g…` vs `tx.meta.returnData` — and whether the txoracle `AQ==` survives a transfer-free `resolve`. Have the escrow emit its own `ProofVerified{result:bool}` Anchor event as a program-owned backup artifact.
4. **Hash-fn recompute spike (fix R3#6):** reverse-engineer the fold from the real bundle (§4.6). High ROI for the "highly valued" bonus; resolve the `eventStatRoot == subTreeProof[0]` anomaly.
5. **Odds-decode spike (fix R2#3, R1#9):** inspect a real `/api/odds/snapshot` payload; learn `prices[]` units before committing twin-bar math.
6. **Leaf `period` spike (fix R1#4):** confirm the exact `ScoreStat.period` the endpoint emits per statKey/phase, so authored markets settle.

**[OPEN — user decision (the project's biggest fork): the fallback if the custom escrow-CPI program can't ship in time.** Either (a) a self-owned escrow that still CPIs `validate_stat` (preserves the BRIEF-L31 headline, consistent with LOCKED DECISION 2), or (b) the shipped devnet `settle_trade` lifecycle (self-contained, pays in one rpc) — **but (b) does NOT CPI `validate_stat` (§8), silently abandoning the #1 Track-1 ask AND contradicting LOCKED DECISION 2.** Strong recommendation: keep a CPI in the path even in the fallback, because the CPI *is* the differentiator.]**

#### 4.11B Frontend phases (each ≤5 files, against the frozen IDL / a stub feed)
- **Wk1 / Phase A:** wallet + pre-funded burner + USDC faucet; the snapshot-poll Route Handlers; react-query hooks over on-chain pool PDAs (or the **stub feed behind `useMarketFeed`** if the program is still landing); Screen 1 (list + scoped twin bar / progress meter). *Verify:* judge connects, funds, sees markets.
- **Wk1 / Phase B:** Screen 2 (authored predicate text, `stake` tx, position) + Screen 3 (per-winner `claim`). *Verify:* end-to-end stake → position → claim on devnet.
- **Wk2 / Phase C (the budget sink):** Screen 4 — six **static** `ProofStep` cards (not a canvas) wired to the real bundle + the captured real tx, Explorer deep links, the optional fold-recompute if Phase 0 nailed the hash, UMA contrast card. *Verify:* every link resolves on devnet Explorer; the daily-root PDA shows EXISTS before the link renders green.
- **Wk2 / Phase D:** Replay (record the genuine end-to-end fixture, §4.10); shoot the video; polish empty/loading/error/pending states.

**Verification gate (global rule):** `npx tsc --noEmit` + `npx eslint . --quiet` clean before any "done"; manual smoke on a fresh burner (no extension) end-to-end.

**Cuts that make 19 solo days realistic:** persistent SSE → snapshot polling; animated Merkle canvas → static step cards; client recompute → optional (Phase-0-gated); public SOL faucet → pre-funded burners; twin-bar → priced markets only; **and the hero anchored to a standalone `validate_stat` tx that exists regardless of whether the full escrow CPI lands.**

### 4.12 Data contracts (so Sections 1–3 know the shape)

- **On-chain (Anchor decode):** pool PDA → `{ fixtureId, predicate{threshold:i32, comparison}, statA{key:u32, period:i32}, statB?, op?, yesPool:u64, noPool:u64, feeBps:u16, lockTs:i64, status, winningSide? }` (final set = Section 2). Frontend computes `P_yes`, `D/Y`, `D/N`, `Δ`.
- **From the snapshot-poll proxy (TxLINE):** odds snapshot → fair-value `P_fair` **for priced markets only** (decode UNVERIFIED, §4.3); scores snapshot → live clock + current `Stats{}` for in-play progress (`probe-proofs4.log:13`).
- **From the proof endpoint (on settle):** `/api/scores/stat-validation?fixtureId=&seq=&statKey=[&statKey2=]` → `{ ts, statToProve{key,value,period}, eventStatRoot[32], summary{fixtureId, updateStats{updateCount:i32, minTimestamp, maxTimestamp}, eventStatsSubTreeRoot[32]}, statProof[], subTreeProof[], mainTreeProof[] }` (file-verified, `probe-proofs4.log:19-28`). **Apply the JSON→Anchor adapter (§4.6) before rendering** (`subTreeProof`→arg `fixture_proof`; `eventStatsSubTreeRoot`→`eventsSubTreeRoot`).
- **From the settle tx meta — corrected (fix R1#1/R3#3):** Step 5 parses the **inner-instruction `Program log: Predicate evaluated to: true` and inner `Program return: 6pW64g…wyP2J AQ==`**, keyed to program `6pW64g…`, **plus** the escrow's own `ProofVerified{result}` event — **not** `tx.meta.returnData` (outer-instruction slot, not `validate_stat`'s).
- **epochDay derivation (fix R3#4):** `epochDay = floor(ts_ms / 86400000)`, seeds `["daily_scores_roots", u16 LE]`. **Pin the `ts` source explicitly** — §7 flags that docs use `summary.updateStats.minTimestamp` while the .ts example used `ts`; they coincide here (both `1782788706633` → 20634) but **straddle a UTC midnight on other fixtures → wrong PDA → a 404 in the live "verify it yourself" link.** Always `getAccountInfo(pda)` and render Step 4 green **only if EXISTS** (the spike already does this, `validate-sim.ts:68`).

### 4.13 Risks / UNVERIFIED — Phase-0 exit checklist

1. **No real settle tx exists (BLOCKER→gated):** all `validate_stat` artifacts are `simulateTransaction` output and `validate_stat` was a top-level call (not yet a CPI). **Gate:** Phase 0 lands a standalone `.rpc()` `validate_stat` tx (and later the real CPI `resolve` + `claim`) before any recording. Step 6 shows a labeled "pending" state until the escrow deploys — never a mockup.
2. **Return-data location (BLOCKER→fixed but Phase-0-confirmed):** in the locked CPI architecture the bool is consumed by `sol_get_return_data`; surface it for display from the **inner log keyed to `6pW64g…`** + our `ProofVerified` event, not `tx.meta.returnData`. The exact log/return surfacing is an inference about the unbuilt escrow until Phase-0 item 3 confirms it.
3. **CPI nesting under-rendered (BLOCKER→fixed):** Step 5 now renders the escrow→CPI→`validate_stat`→bool→release nesting as the receipt's thesis (BRIEF L31).
4. **Two-stat marquee vs single-stat bundle (MAJOR→fixed):** hero is single-stat/byte-faithful; two-stat corners deferred to a Phase-0 capture decision.
5. **`period()` mapping miscited + settlement-unsafe (MAJOR→fixed):** render the human period from the authored label; store the exact on-chain `ScoreStat.period` the feed requires; Phase-0 confirms it; full-match markets only until then. (The `period:7`↔`StatusId:7` link is a single-sample coincidence, not a verified rule.)
6. **Twin-bar has no fair quote for props (MAJOR→fixed):** twin-bar scoped to priced markets (1X2 / OU goals / AH goals); props show verified in-play progress instead. Odds decode itself UNVERIFIED — Phase-0 inspects a real snapshot.
7. **Daily-root PDA link could 404 (MAJOR→fixed):** pin epochDay source, `getAccountInfo` EXISTS-gate the green link; captured PDA `BcLwqH…` verified EXISTS.
8. **Plan budgeted zero days for the program (MAJOR→fixed):** explicit Phase 0 installs toolchain, deploys a stub, freezes the pool IDL; Screens 1–3 build against a stub feed behind `useMarketFeed`.
9. **SSE-on-Vercel footgun (MAJOR→fixed):** dropped for snapshot polling; no demo cost (Replay is the real demo).
10. **Merkle canvas over-budgeted (MAJOR→fixed):** static step cards keep 100% of the trust (the links) at ~20% of the cost.
11. **Client fold-recompute (MAJOR→elevated):** promoted to a Phase-0 must-try (highest-ROI bonus, BRIEF L28/L33); the `eventStatRoot == subTreeProof[0]` head match means the fold order is not yet understood — if the hash fn resists, ship the fold as illustrative (Explorer links + on-chain `validate_stat` are the authoritative proof).
12. **Team identity (MINOR→fixed):** render names from the fixtures snapshot; "Participant 1/2" fallback; never hardcode "Brazil/Argentina" against synthetic fixture 18172280.
13. **Fallback program (OPEN):** custom escrow-CPI vs self-owned escrow vs shipped `settle_trade` — the last abandons the CPI headline and contradicts LOCKED DECISION 2; keep a CPI in the path. User decision before freezing the IDL.

---

All key facts verified against the spike artifacts (`validate-sim.log`: proof lens stat=6/subTree=6/mainTree=1, epochDay 20634, root `BcLwqH…` 9232B, both TRUE/FALSE succeed at ~205k CU; `validate-sim.ts:1-5` still encodes the disproven assert-or-revert model and loads the stale IDL). Producing the refined section.

## Section 5 — Risks, Phase 0 Spike, Phasing, Testing

### 5.0 What is already de-risked vs. what is only *assumed*

Be precise about the boundary, because three reviewers correctly flagged that the draft treated the **settlement-correctness** surface as proven when only the **valid-proof / predicate-flip** path was ever observed.

**Empirically proven on devnet (do not re-spend gate time here):**
- Full auth → on-chain `subscribe(SL1)` → `activate` → SSE/snapshot/scores-decode runs live (`validate-sim.log:8-10`; TECH-REFERENCE §3, §0).
- The bundle from `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=` reconstructs to the **on-chain** `daily_scores_roots` PDA (fixture `18172280`, seq `1068`, statKey `1`, leaf `{key:1,value:1,period:7}`, `ts=1782788706633`, `epochDay=20634`, lens stat=6/subTree=6/mainTree=1; root PDA `BcLwqH…` EXISTS, 9232 B, owner `6pW64g…`; `validate-sim.log:14-19`).
- `validate_stat` is a **read-only bool oracle, not assert-or-revert**: TRUE → `AQ==` (0x01), FALSE → `AA==` (0x00), **both txs SUCCEED at ~205k CU** (`validate-sim.log:30-32, 43-45`). IDL `"returns":"bool"` (devnet.mdx:1611). Discriminator `[107,197,232,90,191,136,105,185]`; single read-only account `daily_scores_merkle_roots` (devnet.mdx:1526-1540).

**Assumed but NOT yet observed — each is now an explicit Phase-0/Phase-2 probe or a risk row:**
1. The bool can be read **inside another program** via `sol_get_return_data` after a real on-chain `invoke` (off-chain `simulateTransaction` only, so far — `validate-sim.ts:103`). *The genuine gap* (TECH-REFERENCE §7, §8).
2. A **tampered** proof makes `validate_stat` **error** (not silently return `false`). Never tested — every observation flipped only the *predicate* on a *valid* bundle (`validate-sim.ts:92-97`). The entire "self-authenticating, malicious keeper can't mis-settle" thesis rides on this. **UNVERIFIED — Phase 0 probe P-adv-2.**
3. A proof from an **earlier (non-final) seq** is *also* a valid Merkle leaf, so `validate_stat` honestly returns the wrong-but-real value for a `LessThan`/`EqualTo`/NO-side outcome. `validate_stat` has **no `gameState`/full-time notion** — the leaf is `{key,value,period}` only. **This is the central trust hole** (§5.0a).
4. Live-feed `gameState`/`seq` for full-time detection — TECH-REFERENCE §5 confirms these only on `/api/scores/historical`, "live-payload `seq` **not confirmed**." **UNVERIFIED — Phase 2.**

#### 5.0a — The resolution trust model, stated honestly (resolves R1#1, R2#2, R3#1)

`validate_stat` proves *"this exact `{key,value,period}` leaf was a real member of the published daily root at the seq whose bundle was fetched."* It does **not** prove *"this seq is full-time."* Therefore the honest claim is:

> **The outcome *computation* is pure math — one CPI, deterministic, no voting, no dispute window. The *only* off-chain input is the selection of the final-whistle seq, performed by a single named keeper and independently re-verifiable by anyone.**

This is still a categorical win over UMA/betmoar (trust distributed across ~103 voters + multi-hour commit-reveal + dispute risk → our trust = one auditable seq choice). The fixes that make it true on-chain:

- **`resolve` reconstructs the question from the `Market` account, never from caller args.** The caller supplies *only proof witnesses* (`ts`, `fixture_summary`, the three proof vecs, the leaf `stat_value`, `event_stat_root`). The program builds `TraderPredicate{threshold: market.threshold, comparison: market.comparison}` and `StatTerm{stat_to_prove: ScoreStat{key: market.stat_key, value: stat_value, period: market.period}, event_stat_root, stat_proof}` from **stored Market fields**. A caller cannot substitute "goals>0" for "goals>2." (R3#1)
- **Fixture binding:** `require_eq!(fixture_summary.fixture_id, market.fixture_id)` — settling market A with fixture B's (valid) proof is rejected. (R3#1)
- **Day binding:** derive `epoch_day = (ts / 86_400_000) as u16`; `require_eq!(epoch_day, (fixture_summary.update_stats.min_timestamp / 86_400_000) as u16)` (closes the `ts`-vs-`min_timestamp` UTC-boundary ambiguity, TECH-REFERENCE §7, R1#5); and constrain the passed roots account by seeds: `seeds=[b"daily_scores_roots", epoch_day.to_le_bytes()], seeds::program = TXORACLE` — an unconstrained roots account would let a permissionless caller pass any day's root (R1#9).
- **Seq/full-time binding (the residual trust):** `resolve` is signed by `market.resolver` (a named keeper authority set at `init_market`) **and** wall-clock gated: `require!(Clock::get()?.unix_timestamp >= market.settle_after_ts)` where `settle_after_ts = kickoff + ~150 min` (90' + stoppage + buffer). For **monotonic-increasing** stats (goals, corners, cards) with a `GreaterThan` predicate, the YES side is genuinely trustless (once true it stays true through FT); only the **NO** side and all `LessThan`/`EqualTo` markets depend on the keeper picking the FT seq. Bias the demo markets toward monotonic `GreaterThan` so most settlements are trustless, and label the keeper's seq choice an explicit role.

> **[OPEN — user decision: resolver authority model.]** Ship (a) **keeper-authority `resolve`** (one `market.resolver` signer + wall-clock gate — simple, honest, demo-safe, recommended for the 19-day MVP), or (b) invest in a **trustless FT binding** (would require TxODDS to expose a last-seq/`gameState` attestation inside the tree — currently absent; raise as API feedback). Default = (a).

---

### 5.1 Phase 0 — Go/No-Go Spike (FIRST work; HARD gate)

Reviewers converged that **N2 (the return-data round-trip) is near-certain** (standard syscall + IDL `"returns":"bool"` + observed 0x01/0x00) and **N1 (toolchain pairing) and proof-size are the real unknowns** (R3#9). Budget accordingly: Day 1 = toolchain, Day 2 = analytic + measured size bound **and** the round-trip confirm, Day 3 = adversarial probes + decision.

#### 5.1.a — Toolchain install + hello-world deploy (Day 1)

**State (TECH-REFERENCE §10):** `anchor-cli 0.30.1`, `avm 0.30.1`, `cargo/rustc 1.92`, `bun 1.2.8` present; **no `solana` CLI, no `cargo-build-sbf`, no `solana-test-validator`**; local anchor (0.30.1) ≠ root `package.json` pin (`^0.31.1`). IDL spec is `0.1.0` (Anchor ≥0.30 account format — a 0.30.x TS client reads a 0.31.x program).

**Version pairing (decide, don't relitigate):**
- Install Agave (ships `cargo-build-sbf`, `solana-test-validator`, `solana`): `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`.
- Standardize on **Anchor 0.31.1** to match the root pin: `avm install 0.31.1 && avm use 0.31.1`; bump `step1-spike` `@coral-xyz/anchor` `^0.30.1 → ^0.31.x` (verified: spike `package.json:13` currently `^0.30.1`).
- **UNVERIFIED — confirm Day 1:** the exact Agave line Anchor 0.31.1 builds against (historically Solana 2.1.x). If `anchor build` fails on `stable`, pin Agave (`agave-install init <ver>`).
- **Fallback pairing if 0.31.1 won't build by EOD Day 1:** drop to the already-installed **Anchor 0.30.1** + matching Agave, TS client at `@coral-xyz/anchor 0.30.x`. Invariant: *program-build `anchor-lang` ⇄ TS `@coral-xyz/anchor` major.minor must agree on IDL spec 0.1.0.*

**Tasks:** reuse `step1-spike/devnet-wallet.json`; `solana config set --url devnet`; **pre-fund the deploy wallet to ~10 SOL early** (a parimutuel `.so` + iterative redeploys cost several recoverable SOL and the faucet rate-limits hard — R2#14; `gen-and-fund.ts`/`fund-retry.ts` are fallbacks); **reuse ONE program keypair across redeploys** to avoid re-paying program rent. `anchor init proofmarket`, build, deploy, invoke a trivial ix, confirm.

**Done-when:** `solana/cargo-build-sbf/anchor --version` all resolve; `anchor build` emits a `.so`; hello-world program account exists on devnet and an instruction tx confirms.

#### 5.1.b — Layout pre-check + CPI round-trip + adversarial probes (Days 2–3)

**Pre-build byte-equality test (Day 1–2, BEFORE deploying anything — R2#12, fixes the self-contradictory Risk #11 mitigation):** in TS, encode `validate_stat` for the known-good bundle with `@coral-xyz/anchor` `BorshInstructionCoder`, capture the bytes; assert the Rust `ValidateStatArgs::try_to_vec()` output is **byte-identical**. Catches field-order/endianness drift with zero deploys. The hand-redeclared structs are byte-accurate to the IDL (field order/types verified by all three reviewers): `ScoresBatchSummary{fixture_id:i64, update_stats:ScoresUpdateStats{update_count:i32, min_timestamp:i64, max_timestamp:i64}, events_sub_tree_root:[u8;32]}` (devnet.mdx:2876-2926), `ProofNode{hash:[u8;32], is_right_sibling:bool}` (2831-2849), `ScoreStat{key:u32, value:i32, period:i32}` (2852-2873), `StatTerm{stat_to_prove, event_stat_root:[u8;32], stat_proof:Vec<ProofNode>}` (2957-2989), `TraderPredicate{threshold:i32, comparison:Comparison{GreaterThan,LessThan,EqualTo}}` (3103-3120 / 2281-2295), `BinaryExpression{Add,Subtract}` (2267-2278); 8-arg order `(ts, fixture_summary, fixture_proof, main_tree_proof, predicate, stat_a, stat_b, op)` matches devnet.mdx:1541-1611.

**Throwaway `probe_validate` program — ONE instruction that, immediately after the CPI, reads the bool into a local (the order matters; see GO#3):**
```rust
let mut data = vec![107,197,232,90,191,136,105,185];               // validate_stat discriminator
data.extend_from_slice(&ValidateStatArgs{ ts, fixture_summary, fixture_proof,
    main_tree_proof, predicate, stat_a, stat_b:None, op:None }.try_to_vec()?);
let ix = Instruction{ program_id: TXORACLE,                         // 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
    accounts: vec![AccountMeta::new_readonly(roots.key(), false)], data };
invoke(&ix, &[roots.to_account_info(), txoracle_prog.to_account_info()])?;
let (rp, ret) = get_return_data().ok_or(ProbeErr::NoReturnData)?;   // read IMMEDIATELY, before any other CPI
require_keys_eq!(rp, TXORACLE);
let outcome: bool = ret.first().copied().unwrap_or(0) == 1;         // 0x01 true, 0x00 false
```
Accounts: `daily_scores_merkle_roots` (read-only, txoracle-owned), `txoracle_program`, `payer` (signer). Request ~400k CU (validate_stat alone ~205k, `validate-sim.log:30`). Run via a **real `.rpc()`**, not `simulateTransaction`.

**Run the CPI hermetically with `--clone` (R2#5, R3#6 — this single change collapses three problems):**
```
solana-test-validator --url devnet \
  --clone-upgradeable-program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J \
  --clone BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe
```
This snapshots the txoracle program + the exact `epochDay 20634` root PDA into a frozen local genesis → the real `validate_stat` CPI runs **offline, deterministically, forever**, independent of devnet root retention. Keep ONE live-devnet pass for the deployed-endpoint sanity check.

**Three adversarial probes (the new, decisive part):**
- **P-adv-a (round-trip):** known-good bundle, predicate `threshold=2,LessThan` → expect 0x01; `threshold=1,LessThan` → expect 0x00 (mirrors `validate-sim.ts:92-97`). Assert `get_return_data()==Some`, `rp==6pW64g…`, **1-byte** payload, **both txs SUCCEED**.
- **P-adv-b (tampered proof MUST error — resolves R1#2):** corrupt one `ProofNode.hash` in `stat_proof`. Assert the CPI **returns an `Err`** (Stage-1 fail), **not** a clean `false`. If it instead returns `0x00`, then "proof-invalid" and "predicate-false" are indistinguishable from one byte → the self-authenticating thesis is *false* and we must re-architect (escalate immediately). **This is the most important new probe.**
- **P-adv-c (wrong-fixture / wrong-day rejected by OUR guards):** pass a valid foreign-fixture proof and an earlier-day root → assert our `require_eq!(fixture_id)` / roots-PDA-seed / `epoch_day` guards reject before the CPI.

**Analytic proof-size bound (Day 2, arithmetic not a live capture — resolves R3#7, R1#8):** `ProofNode = 33 B`. Proven depths: stat=6, subTree=6, mainTree=1. Daily **main tree** is over **fixtures** (~104 leaves → depth ≤7 → ≤231 B), not over batches; the per-fixture **sub-tree** spans a day's score-events (~288 batches × stats → depth ~11-13 → ~360-430 B); stat-proof stays ~6 (≤200 B). Worst-case ≈ stat 200 + subTree 430 + mainTree 231 + summary ~60 + leaf/`stat_to_prove` ~52 ≈ **~975 B of *instruction data***; once the sig (~64 B), ~4 account keys (~128 B), blockhash and headers are added the **full serialized tx reaches ~1150–1230 B — *tight* against the 1232-B packet cap**, not the comfortable ~950 B the proof-data subtotal alone suggests. Likely case (subTree near the observed depth 6) ≈ ~1030 B. Compute it exactly in the probe; **because the worst case can graze the cap, pre-commit the mitigation now:** split into a "write proof to a scratch PDA" tx then a **proof-free** `resolve` that reads the PDA (account data is exempt from the 1232-B *tx* limit) — note this makes resolve **two-tx**, a UX wrinkle to flag in the demo. Versioned/ALT txs save only ~90 B (this tx is data-heavy, not account-heavy), so they do **not** rescue an over-cap proof — the binding constraint is instruction *data*.

#### GO criteria (ALL must hold)
1. 5.1.a complete: hello-world deployed + invoked.
2. P-adv-a: `get_return_data()==Some`, `rp==6pW64g…`, 1-byte payload; 0x01/0x00 correct; both succeed.
3. **P-adv-b: tampered proof makes the CPI ERROR** (proof-invalid ≠ predicate-false). *(If it returns 0x00 instead → NO-GO, re-architect.)*
4. **Real `resolve` shape** (CPI + `outcome` write + Market guards, **no token transfer** — token accounts live only in `claim`) is **< 1232 B** and **≤ ~400k CU** on the analytic worst-case proof. *(GO#4 was rewritten: the old "CPI + SPL `transfer` in the same instruction" tests a shape the design never uses — and worse, the Token `transfer` CPI overwrites return data, so a post-CPI transfer would zero the bool and produce a **false NO-GO**. R1#3, R2#7, R3#8.)*

#### NO-GO triggers
- **N1:** no compatible Anchor/Agave/`cargo-build-sbf` set by EOD Day 1 under *either* pairing.
- **N2:** `get_return_data()` returns `None`/wrong-id/malformed after the real CPI (low likelihood — re-rated, R3#9).
- **N2′ (new):** tampered proof returns a clean `false` instead of erroring (P-adv-b) — breaks self-authentication.
- **N3:** real-day proof can't fit 1232 B *and* the scratch-PDA two-tx mitigation can't land by EOD Day 3 (given the tx grazes the cap in the worst case, treat this as a live possibility, not a formality).

#### Fallbacks (branch at EOD Day 3; order (i) → (ii))
**(i) Self-Merkle verification in our program (resilience backup — NOT the default; R3#2).** Read the daily root straight from the public `daily_scores_merkle_roots` PDA bytes and re-implement the 3-level chain (stat leaf → `eventStatRoot` via `statProof` → `eventsSubTreeRoot` via `subTreeProof` → daily root via `mainTreeProof`; sibling order positional from `is_right_sibling`: `parent = H(is_right ? node‖sib : sib‖node)`). **The hash function + leaf encoding are UNDOCUMENTED** and the search space is **wider than the draft's 6 combos** (R2#8): enumerate `{sha256, keccak256} × {raw concat, Borsh leaf, length-prefixed} × {leaf/internal domain-separation prefixes (RFC-6962 0x00/0x01)} × {i32/u32 endianness} × {fixtureId mixed into leaf or not} × {positional vs sorted siblings}`. **Capture TWO independent leaf→root chains** so the scheme is over-determined, not fit to one sample. Brute-force offline in TS against the on-chain root, then port the winner to Rust. **Tripwire: if uncracked by Day 5 → (ii).** This removes the CPI dependency and is mainnet-portable — but forfeits the brief's explicit CPI credit, so it is a *backup*, not a co-equal.

**(ii) Hybrid via TxODDS `settle_trade` (last resort).** Loses the "own engine / CPI into `validate_stat`" credit the brief rewards (HACKATHON-BRIEF L31); `create_trade` needs **3 signers** incl. the `txoracle` authority via the README-flagged-illustrative `/api/trading/*` (UNVERIFIED callable, TECH-REFERENCE §8); its 2-party `TradeEscrow` doesn't map onto our N-user pool. Use only if (i) can't be cracked by Day 5.

**Reuse-as-Proof-Receipt twist (R3#2):** even when CPI ships as the fund-release path, build a **client/Rust self-Merkle verifier** anyway and use it to power the Proof Receipt's node-by-node visualization (§5.4d). The self-Merkle work then *strengthens the hero* instead of being a discarded fallback.

**Phase-0 EXIT ARTIFACT (R3#10):** the minimal working CPI/`get_return_data` consumer + a short findings note (bool-oracle confirmation, tampered-proof behavior, measured byte/CU budget, the missing-CPI-example gap, stale `idl/txoracle.json` v1.4.7 vs v1.5.2 trap) — captured **now** while fresh, offered back as a gist/PR. This *is* the required API-feedback deliverable (HACKATHON-BRIEF L14), produced as a byproduct rather than deferred to Phase 4.

---

### 5.2 Risk register

| # | Risk | Likelihood | Impact | Mitigation (phase) |
|---|---|---|---|---|
| 1 | **Wrong-seq mis-settlement** — `validate_stat` proves "predicate held at seq X," not "X is full-time"; a valid earlier-seq proof settles `LessThan`/NO wrongly (TECH-REFERENCE §5, §7) | **High (will be attempted)** | **Critical** (breaks trust thesis) | §5.0a: keeper-authority `resolve` + wall-clock `settle_after_ts` gate + bias demo to monotonic `GreaterThan`; P-adv-c (Phase 0); disclosed-trust narrative |
| 2 | **Predicate/fixture substitution** — caller overrides predicate/stat or settles market A with fixture B's valid proof | High | **Critical** | `resolve` reconstructs predicate/stat_key/period from `Market`; `require_eq!(fixture_id)`; negative test (Phase 0/1) |
| 3 | **Toolchain / version pairing** — no `solana`/`cargo-build-sbf`; 0.30.1 vs 0.31.1 pin (TECH-REFERENCE §10) | Med | **Critical** | 5.1.a: Agave stable + `avm install 0.31.1`; fallback 0.30.1 pairing; pin exact versions in README |
| 4 | **Tampered proof returns `false` not error** — proof-invalid indistinguishable from predicate-false | Low | **Critical** | P-adv-b (Phase 0); NO-GO N2′ → re-architect |
| 5 | **CPI return-data round-trip broken** on-chain | **Low** (re-rated, R3#9) | Critical | P-adv-a (Phase 0); quick confirm, not the budget centerpiece |
| 6 | **Payout u64 overflow** — `amount * net_loser` wraps above ~$4,300/side at 6-dp (√2⁶⁴ ≈ 4.29e9 base units) | **High** (latent) | High | u128 intermediate + checked math; explicit $50k/side overflow test (Phase 1) |
| 7 | **epochDay derivation ambiguity** (`ts` vs `min_timestamp`, UTC-midnight) → wrong root PDA (TECH-REFERENCE §7) | Med | High | Assert `epoch_day(ts)==epoch_day(min_timestamp)`; seed-constrain roots PDA (Phase 1) |
| 8 | **Proof > 1232 B / CU** on a busy 104-fixture day | **Med** (worst-case *full tx* ~1150–1230 B grazes the 1232 cap; the ~950 B figure is proof-data only) | High | Analytic bound + **measure exactly** in 5.1.b; scratch-PDA two-tx if over |
| 9 | **Live `gameState`/`seq` unconfirmed** — FT detection only verified on `/api/scores/historical` (TECH-REFERENCE §5) | Med | Med | Drive FT off `/api/scores/historical/{fixtureId}`; Phase-2 spike before trusting stream |
| 10 | **Devnet root retention** — root PDA pruned before judging (Jul 20-29) | Med | **Med→Low** | `--clone`'d local validator for demo/CI; pre-seed market as `Resolved`; copy consumed root into our PDA; anchor receipt to permanent `resolve` tx sig (§5.5) |
| 11 | **Parimutuel edge cases** — one-sided pool, zero-winner, dust, double-claim | High | Med | Refund path + `claimed` flag + dust→treasury + Open→Locked→Resolved machine; unit coverage (Phase 1.5) |
| 12 | **Devnet test-USDC provisioning** — no USDC constant exists (TECH-REFERENCE §8) | Low | High | Our SPL test mint + `faucet` ix minting 1000 test-USDC; pre-seed demo wallets (Phase 1/3) |
| 13 | **Judge data-access friction** — SL1 `subscribe` is an on-chain tx needing the judge's wallet + SOL (TECH-REFERENCE §3 L72) | Med | High | **Server-side ingestion:** app holds ONE pre-activated `apiToken`; judge wallet touches only `stake`/`claim`/`faucet` (R2#9) |
| 14 | **Scope/time** — solo, ~19 days, first Anchor program | High | High | Thinnest-viable program (§5.3); HARD gate; two schedule variants; cut-lines |
| 15 | **Keeper has no persistent host** — Vercel can't run a poller (R2#11) | Med | Med | **Client-triggered `resolve`** button (the keeper-authority model already supports it) for the demo; optional Railway/Fly cron for live |
| 16 | **Borsh layout mismatch** — hand-redeclared args ≠ IDL | Med | High | TS↔Rust byte-equality test BEFORE deploy (5.1.b); transcribe field order from devnet.mdx |
| 17 | **Anchor 0.31 ⇄ Agave build incompat** (exact pin UNVERIFIED) | Med | Med | Pin Agave to 0.31.1's target line; fallback 0.30.1 (Phase 0) |
| 18 | **Stale spike narrative** — `validate-sim.ts:1-5,120` still assert assert-or-revert/`Custom(6021)`; loads v1.4.7 IDL (TECH-REFERENCE §0) | Low | Med | Rewrite header/VERDICT to bool-oracle model; pin v1.5.2 mdx IDL before building 5.4(b) on it (R2#13) |
| 19 | **TxODDS authority/endpoint dep** (hybrid fallback only) | Med (if taken) | Med | Prefer CPI then self-Merkle; hybrid last resort |
| 20 | **Period mis-keying** — leaf `period` is non-zero (proven `=7`), not `0` despite "no multiplier" framing (TECH-REFERENCE §6a; `validate-sim.log:15`) | Med | Med | `period` read from the bundle, never assumed `0`; stored in `Market.period` (Phase 1) |
| 21 | **Frontend devnet UX friction** — Phantom devnet, ATA creation | Med | Med | Auto-create ATAs, faucet button, network hint, read-only demo fallback (Phase 3) |

---

### 5.3 Phasing — TWO schedule variants (Jun 30 → Jul 19 23:59 UTC, HACKATHON-BRIEF L9)

The draft's single happy-path table had no NO-GO branch and over-packed Phase 1 (R2#1, R2#3). Below: a GO track and a NO-GO/self-Merkle track, plus a real buffer day. **Thinnest-viable program for Phase 1 = `init_market / stake / resolve / claim` only;** `faucet`, `refund`, dust-sweep, and two-stat (`stat_b`/`op`) are **Phase 1.5 / cut-list**, not silently inside the core days.

#### Variant A — GO on Day 3 (expected)
| Days | Dates | Phase | Output |
|---|---|---|---|
| 1–3 | Jun 30–Jul 2 | **Phase 0 — HARD GATE** | Toolchain (D1) → byte-equality + round-trip + size bound (D2) → P-adv-a/b/c + decision (D3). API-feedback exit artifact. |
| 4–10 | Jul 3–Jul 9 | **Phase 1 — thinnest-viable program** | `init_market, stake, resolve (CPI), claim`; payout pure `cargo test`; hermetic `--clone` CPI integration test (TRUE **and** FALSE paths); deploy. |
| 11–13 | Jul 10–Jul 12 | **Phase 1.5 + Phase 2** | `faucet`, `refund`/one-sided/dust-sweep + tests; ingestion reuse; market-gen (3–5 monotonic-biased markets); client-triggered keeper (FT off `/api/scores/historical`). |
| 14–17 | Jul 13–Jul 16 | **Phase 3 — Frontend + hero** | Market list, stake UI, **Proof Receipt with live self-verify** (§5.4d), **UMA/betmoar contrast panel** (§5.4e), TxLINE-odds fair-value baseline, faucet button. Deploy (Vercel, devnet). |
| 18 | Jul 17 | **Phase 4 — demo/docs** | ≤5-min video on **replayed + `--clone`'d** data; tech doc; E2E replay; judge-path script. |
| 19 | Jul 18 (+ Jul 19 AM **buffer**) | **Submit** | Submit well before deadline; buffer for faucet re-seed / root re-capture. |

#### Variant B — NO-GO or self-Merkle (gate slips to Day 5)
| Days | Phase | Output |
|---|---|---|
| 1–5 | **Phase 0 extended** | Toolchain + **offline hash-crack of the Merkle scheme** (two chains, widened search) + **2-day Rust Merkle port** as a *separate* line item. **Tripwire: uncracked by Day 7 → hybrid (ii).** |
| 6–11 | **Phase 1 (self-Merkle resolve)** | Same thinnest-viable program, `resolve` reads root from PDA + self-verifies. |
| 12–14 | **Phase 1.5 + Phase 2** | as Variant A, compressed. |
| 15–17 | **Phase 3** | Frontend + hero (compressed to 3 days). |
| 18–19 | **Phase 4 + Submit** | demo/docs; submit. |

**Critical path:** Phase 0 proof → `resolve` → keeper/client trigger → settlement + Proof Receipt. The single highest-risk *correctness* node is the wrong-seq binding (Risk #1); the highest-risk *feasibility* node is the first-ever Anchor program (Risk #14) — which is why the program is scoped to four instructions and edge paths are Phase 1.5.

**Cut-lines (drop in order if behind):**
1. Two-stat differential markets (`stat_b`/`op`) → single-stat only (also drops MissingSecondStat 6025 / UnexpectedSecondStat 6026 / InvalidStatCombination 6024).
2. Live SSE in frontend → snapshot/`/api/scores/updates` polling.
3. Auto-gen across 104 fixtures → 3–5 hand-picked monotonic markets.
4. TxLINE-odds fair-value overlay → parimutuel implied prob only.
5. Keep `refund`/one-sided paths **in the program** (safety) but don't demo them.
6. **Last resort:** Phase-0 NO-GO + self-Merkle uncracked by Day 7 → hybrid `settle_trade` (fallback ii).

---

### 5.4 Test strategy

**Data model under test** — `Market{ fixture_id:i64, stat_key:u32, period:i32, threshold:i32, comparison:u8, stat_b:Option<…>, op:Option<…>, settle_after_ts:i64, lock_ts:i64, status:u8{Open,Locked,Resolved}, outcome:Option<bool>, yes_pool:u64, no_pool:u64, fee_bps:u16, usdc_mint:Pubkey, treasury:Pubkey, resolver:Pubkey, resolved_root:[u8;32], resolve_tx:[u8;64], bump, vault_bump }`; `Position{ market:Pubkey, owner:Pubkey, side:u8{Yes,No}, amount:u64, claimed:bool, bump }`. (`resolved_root` copies the consumed daily-root bytes at settlement and `resolve_tx` stores the settlement signature, so the receipt re-renders without TxODDS retention — R3#5.)

**Payout (winner side; `winner_pool`/`loser_pool`; fee `f` bps) — u128 intermediate, checked (R2#4):**
```
net_loser = loser_pool * (10000 - f) / 10000
payout(u) = u.amount + ((u.amount as u128 * net_loser as u128) / winner_pool as u128) as u64   // checked, no u64 overflow
```
Winner's own stake returned untaxed; winnings = pro-rata share of the *net* loser pool. `winner_pool == 0` → **refund mode** (each staker reclaims own `amount`, fee waived). Floor-division dust stays in the vault → swept to `treasury` on close. Invariant: `Σ payouts + dust + fee == yes_pool + no_pool`.

**(a) Pure Rust / Anchor program tests** (math = pure `cargo test`; rest on `solana-test-validator`):
- *Payout math:* uneven pools, fee correctness, rounding/dust conservation, single-staker, whale-vs-dust, **and an explicit `$50k+/side` overflow test** asserting no u64 wrap.
- *Resolution binding (the new, critical guards — Risks #1, #2, #7):* `resolve` rebuilds predicate/stat from `Market` (caller predicate args ignored/absent); reject mismatched `fixture_id`; reject `epoch_day(ts) != epoch_day(min_timestamp)`; reject a roots account not matching `PDA(['daily_scores_roots', epoch_day_LE], TXORACLE)`; reject `Clock < settle_after_ts`; reject non-`resolver` signer.
- *Claim guards:* double-claim rejected (`claimed` flag + position account closed for rent); claim-before-Resolved rejected; losing-side claim rejected.
- *State machine:* `stake` after `lock_ts`/Locked rejected; `resolve` twice rejected (`require status==Locked`); `resolve` before lock rejected; `claim` only when `Resolved`.
- *Edge cases:* one-sided pool → refund-all; zero-winner → refund-all; dust → treasury.

**(b) CPI integration test — hermetic, via `--clone` (the single most important test).** Clone txoracle + a **freshly-captured** root PDA (parametrize on `scan-roots.ts`/`validate-sim.ts`; **stop hard-coding `18172280/20634`** — treat it only as the Phase-0 proof — R1#6). Run BOTH outcomes end-to-end (R2#6):
- **TRUE path:** `init_market` (monotonic `GreaterThan`) → `stake` YES+NO from two wallets → `lock` → `resolve` reads `0x01` via `get_return_data` → asserts `outcome=Some(true)`, `status=Resolved`, `resolved_root` copied → YES `claim` → SPL delta == `compute_payout`.
- **FALSE path (was missing):** same with the proven FALSE predicate (`threshold=value, LessThan` → `0x00`, `validate-sim.ts:92-97`) → asserts `outcome=Some(false)` → **NO-side** `claim` → SPL delta == `compute_payout`. Half the settlement logic ships unverified without this.
- **Adversarial:** earlier-seq valid proof → rejected by the binding guards (defense-in-depth for Risk #1); tampered proof → CPI errors (P-adv-b re-asserted on real `.rpc()`).

Rewrite the spike header/VERDICT to the bool-oracle model and pin the v1.5.2 mdx IDL before extending `validate-sim.ts` (R2#13). The real `resolve` CPI **does** run on a `--clone`'d validator (the draft's "cannot run on a bare local validator" was right only for a *bare* one — R2#5/R3#6).

**(c) E2E replay test — fully hermetic.** Capture one match's `/api/scores/updates` + final-seq `stat-validation` bundle to fixtures; replay market-gen + keeper offline & deterministically; the `resolve` CPI hits the **`--clone`'d local root**, not live devnet — so the recording survives root pruning (Risk #10). Capture wall-clock `FT gameState → Resolved confirmation` here to feed the contrast panel (§5.4e).

**(d) Proof Receipt verification test (the "highly valued" hero, was uncovered — R3#3).** A **Phase-3 done-when**, not a Phase-4 checkbox:
- Acceptance test: every rendered node hash (leaf → `eventStatRoot` → subtree → daily root) **byte-equals** the bundle/PDA bytes used in the real `resolve`.
- UI affordance: a **"verify this proof yourself"** button that re-runs `validate_stat` live (showing `0x01`) **and** a permalink to the on-chain `resolve` tx's return data in Explorer.
- The receipt renders from persisted `Market{outcome, resolved_root, resolve_tx}` — the **on-chain `resolved_root` copy** our program keeps is the real retention guarantee, and the recorded `resolve` tx **signature** is permanent (its Explorer return-data permalink is best-effort on a non-archival devnet RPC — R3#5).

**(e) UMA/betmoar contrast artifact (the UX wedge, was un-scheduled — R3#4).** A **Phase-3** side-by-side panel: *UMA — propose + commit-reveal vote (~103 voters) + multi-hour reveal window + dispute risk* vs *ProofMarket — 1 CPI, ~205k CU (`validate-sim.log:30`), deterministic, 0 disputes.* Surface the captured "resolved in N seconds, 0 disputes" number (from §5.4c) on the receipt and in the ≤5-min video — the money shot for demo-centric judging (HACKATHON-BRIEF L13).

**Concrete account lists:**
- `resolve` (signer = `market.resolver`): `market` (writable), `daily_scores_merkle_roots` (read-only, seed-constrained to `PDA(['daily_scores_roots', epoch_day_LE], TXORACLE)`), `txoracle_program`, `resolver` (signer). *No token accounts.*
- `claim`: `market` (read-only, Resolved), `position` (PDA `['position', market, owner]`, writable, closed on claim), `escrow_vault` (PDA ATA, writable), `market_authority` (PDA `['mkt_auth', market]`, vault signer), `user_token_account`, `usdc_mint`, `token_program`, `system_program`.

---

### 5.5 Judge-testability checklist (HACKATHON-BRIEF L12-16; TECH-REFERENCE §12)

- [ ] **Public repo** (MIT/Apache), README with one-command setup + **pinned exact toolchain versions** (resolves the §10 ambiguity).
- [ ] **Server-side data access (no judge-wallet friction — R2#9):** the app holds ONE pre-activated `apiToken` (guest-JWT → free SL1 `subscribe`/`activate`, no purchase, matches `hackathon-terms.mdx §5.1`); the judge's Phantom devnet wallet touches **only** `stake`/`claim`/`faucet`. State this explicitly so judges don't need devnet SOL to *see* data.
- [ ] **Test-USDC faucet** (Risk #12): `faucet` ix/button mints 1000 test-USDC to any pubkey; pre-seed demo wallets.
- [ ] **Pre-seeded `status=Resolved, outcome=Some` market on devnet** so the Proof Receipt renders instantly from persisted state + the permanent `resolve` tx sig — **no live root needed** (resolves the Risk #10 / judge-path contradiction: a market cannot be simultaneously Open-to-stake and resolvable-against-final-data — R2#10).
- [ ] **Separate sandbox market** whose `resolve` runs against the **`--clone`'d local root** (or our copied `resolved_root`) so judges can fire a settlement that never depends on devnet retention. **Never script a judge to trigger a live-devnet resolve.**
- [ ] **Judge path (3 clicks):** faucet → stake (sandbox) → watch resolve + Proof Receipt; plus a CLI `bun run e2e-replay` for deterministic reproduction without a live fixture.
- [ ] **"Verify it yourself" on the receipt** (re-run `validate_stat` live → `0x01`; Explorer permalink to the `resolve` return data) — independent judge verification of the hero (R3#3).
- [ ] **UMA/betmoar contrast panel** + "resolved in N seconds, 0 disputes" metric visible (R3#4).
- [ ] **≤5-min demo video** on replayed data (HACKATHON-BRIEF L13).
- [ ] **Tech doc — exact endpoints:** `POST /auth/guest/start`, on-chain `subscribe(serviceLevelId=1, weeks)`, `POST /api/token/activate`, `GET /api/fixtures/snapshot`, `GET /api/scores/stream` (+`/api/scores/updates/{epochDay}/{hour}/{interval}`, `/api/scores/historical/{fixtureId}` for FT detection), `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=`, and the on-chain `validate_stat` CPI (program `6pW64g…`, discriminator `[107,197,232,90,191,136,105,185]`, single account `daily_scores_merkle_roots`) — cited (TECH-REFERENCE §3, §5, §7).
- [ ] **API-feedback note** (HACKATHON-BRIEF L14) — delivered as the **Phase-0 exit artifact**: bool-oracle (not assert-or-revert) confirmation; tampered-proof behavior; the missing CPI/`get_return_data` example (now supplied); measured proof byte/CU budget; stale `idl/txoracle.json` v1.4.7 vs v1.5.2 trap; the absent FT/last-seq attestation (motivating a trustless FT binding).


---


## Completeness Critic

Honest assessment of what is still missing or weak across the whole design, beyond the enumerated UNVERIFIED items:

**A. Genuinely unbuilt / highest-risk (already named, restated as gaps):**
1. **The repo's first Rust CPI + `sol_get_return_data` read does not exist yet.** Everything downstream is inert until P0-1 passes. This is correctly the #1 gate, but the spec has *zero* working CPI code today — the entire trust claim is a hypothesis until ~Day 3.
2. **Toolchain is not installed at all** (`solana`, `cargo-build-sbf`, `solana-test-validator`). No `.so` has ever been built on this machine. A single bad platform-tools release on darwin/arm64 can eat the Day-1 budget.
3. **Two-stat bundle has never returned a 200.** All of Tier 2 (the recognizable 1X2/O-U/Corners board — the markets judges expect) rests on an unobserved API response and an *inferred* `statToProve2`/`statProof2`/`eventStatRoot2` shape.

**B. Specification gaps not yet addressed anywhere:**
4. **`fixture_id` source for a *World Cup* market is unsolved.** The devnet feed carries only friendlies (Comp 72/430). The "104 off-chain board" uses a *static/historical WC fixture list* that is **not sourced anywhere in the spec** — where the 104 WC `FixtureId`s + participant names come from (a pinned JSON? a names file?) is undefined. Section 4 forbids fabricated names but no verified names source is identified.
5. **`MarketCreated`/`Staked`/`Claimed`/`Refunded`/`MarketVoided` event field lists are only fully specified for `MarketResolved`.** The other events are named but their exact fields aren't enumerated — minor, but the frontend's optimistic-update + receipt-provenance code needs them pinned.
6. **The faucet is under-specified as an artifact.** It's variously a server-side Route Handler (mint authority) and an on-chain `faucet` ix (Section 5). The mint-authority keypair custody, rate-limiting, and anti-drain protection (a judge or bot could mint unbounded test-USDC and inflate a pool) are unaddressed. For a parimutuel demo this is benign, but a reviewer may ask.
7. **No explicit `MIN_STAKE`/decimals decision for the test-USDC mint.** §2.3 hand-waves `MIN_STAKE = 1_000` base units and "6-dp pools" in tests, but the mint's `decimals` is never fixed. Payout-math overflow bounds (u128 necessity) depend on it.
8. **The "fair-value baseline" — the one TxLINE-odds-native flourish — is entirely UNVERIFIED.** If P0-7 fails, the only verified live TxLINE element on the betting screens is the score/clock ticker. The design correctly degrades, but the "we ingest the full TxLINE odds+scores feed" narrative (a BRIEF pass/fail signal) leans on an unproven decode.
9. **Multi-leg `resolve` (BTTS) is described but its compute/size budget is unverified.** Two `validate_stat` CPIs ≈ 410k CU + two proof payloads could approach the 1232 B tx limit *and* needs two sequential `get_return_data` reads (each immediately after its invoke) — a pattern never tested. If BTTS is promoted to the hero, this becomes a gate.
10. **No rollback/redeploy story for the program.** Iterative `.so` redeploys on devnet (program-data account growth, buffer accounts, ~5 SOL budget) are mentioned but there is no upgrade-authority / program-keypair custody plan, and no statement of whether the program is upgradeable at judging (a security-conscious judge may ask "can you change the escrow after I stake?").
11. **Keeper liveness/operational ownership during Jul 20-29 is thin.** The keeper is "permissionless convenience," but the *sandbox* still needs *someone or something* to keep a rotated live fixture resolvable and the hot wallet / token refresh alive across a 10-day window. No monitoring/alerting or cron is specified.
12. **Solvency under the loser-only fee model is not proven.** §2.4's solvency proof (`Σ floor ≤ payout_pool ≤ vault`) is written for the whole-handle model only. If the loser-only model is chosen, an analogous floor/rounding solvency argument must be re-derived (winners get principal back + a share — the rounding direction and dust accounting differ).

**C. Things that are adequately covered (so the critic is balanced):** the parimutuel math + solvency (whole-handle), the binding assertions, the three-timestamp model, the receipt-degradation ladder, the NO-GO fallback floor, the judge-funding/onboarding path, the cut-line discipline, and the test battery are all specified to an implementable level. The design's *reasoning* is strong; the gap is uniformly **empirical verification** (Phase-0) and a few **unsourced inputs** (WC fixture list/names, mint decimals, event field lists).

---


---


## Open Questions for the User

Consolidated and deduped from all five sections. Ordered by how early they block work (Phase-0/IDL-freezing decisions first).

1. **Resolver authority model (blocks `resolve` + IDL).** Ship (a) **named-keeper `resolve`** — `market.resolver` signer + wall-clock `resolve_after_ts` gate (Section 5's recommended MVP default, accountable for the residual seq choice), or (b) **permissionless `resolve`** (Section 2 — provably safe for monotone-GreaterThan given the finality binding). The `resolver: Pubkey` field exists either way (`default()` = permissionless), so this does not change the struct, only the gate. *Default: (a) for anything beyond monotone-GreaterThan.* *(Sec 2 OQ1, Sec 5 OQ13.)*

2. **Fallback if the custom CPI escrow can't ship (the project's biggest fork; blocks the IDL freeze).** Confirm: (a) a **self-owned escrow that still CPIs `validate_stat`** (preserves the L31 headline + LOCKED DECISION 2), with (b) a **client-simulate receipt-only floor** (no on-chain fund move) as the honest degraded mode. Explicitly reject the shipped `settle_trade` path — it drops the CPI and re-introduces the `create_trade` 3-signer TxODDS co-sign dependency that LOCKED DECISION 2 rejected. **Also confirm the Day-4 Plan-B trigger date** for branching to the narrated/receipt-only fallback if G0/G1 are red. *(Sec 2 OQ1-PlanB, Sec 3 OQ7, Sec 4 OQ12.)*

3. **Payout distribution model (blocks the pool IDL + Screen 3 + Receipt Step 6).** Per-winner **pull-`claim`** (CU-safe, what Screens 3/Step 6 are designed around) vs a capped **auto-distribute** winner set (Screen 3 → read-only "Auto-paid ✓"). *Recommend pull-claim.* *(Sec 4 OQ9.)*

4. **Anchor version pin (blocks Phase-0 toolchain + client parity).** Reconcile the §10 0.30.1 (local avm) ↔ 0.31.1 (root pin) split: commit to **0.31.1 + matching Agave** with a documented fallback to 0.30.1 if it won't build by EOD Day 1; then pin client `@coral-xyz/anchor` + the IDL to **whatever the deployed program is actually built with**, not `package.json`. *(Sec 4 OQ8, Sec 5 §5.1.a.)*

5. **`MONOTONE_CUMULATIVE_KEYS` allowlist + predicate-class breadth (blocks `create_market` validation).** Pin the exact key allowlist (which of goals `1/2`, corners `7/8`, cards `3/4`/`5/6`), and decide whether to broaden beyond `GreaterThan`-only to `LessThan`/`EqualTo` **after** G3 confirms post-FT/terminal-leaf semantics. *Recommend: ship GreaterThan + monotone-only for v1; broaden only post-G3.* *(Sec 2 OQ2.)*

6. **`resolve_after_ts` kickoff-margin policy (blocks Market Gen + the staker-visible trust param).** Set the margin (e.g. kickoff + ~140–150 min to cover stoppage + ET + penalties for knockouts), and decide whether to add an on-chain sanity bound once G3/G4 pin feed timestamp semantics. *(Sec 2 OQ4, Sec 5 §5.0a.)*

7. **Replay anchor (blocks the demo narrative + P0-g scope).** Pursue **P0-g to capture a real `Confirmed:true` finished-friendly bundle** as the legitimate-outcome demo (recommended), or accept the **seq-1068 mid-ET1 unconfirmed anchor** explicitly reframed as "CPI mechanics over a live snapshot" (and drop the "settle only final confirmed" claim from the *demo narrative* only). *Recommend (a); (b) is the honest floor.* *(Sec 3 OQ6, Sec 4 §4.6, Sec 5 Risk #10.)*

8. **Void strength (blocks the liveness instruction set).** Accept **permissionless timeout refund** (`void_timeout` + `refund`) as the v1 terminal non-proof state (recommended; fully preserves the thesis, ~0 extra trust), or fund a **stretch proof-backed void**? Note `validate_fixture` **cannot** prove abandonment (the `Fixture` leaf has no `StatusId`, devnet.mdx:2310-2355), so a stronger void needs an as-yet-unproven terminal scores-leaf proof (+1 unproven path). *Recommend the timeout for v1.* *(Sec 3 OQ5.)*

9. **Forfeiture policy for unclaimed winnings after `CLOSE_GRACE` (blocks `close_market`).** (a) keep the vault open indefinitely for claims and let `close_market` reclaim only fee + dust, or (b) route forfeited winnings to a neutral sink (burn/treasury) — **explicitly NOT the creator** (sweeping a winner's principal to the creator is off-brand for "fair/just math"). *Recommend (a) or (b).* *(Sec 2 OQ3.)*

10. **Hero fidelity — single-stat vs two-stat marquee (blocks the Screen-4 budget + a Phase-0 day).** Invest one Phase-0 day to capture a real `&statKey2=` corners bundle and build a two-leaf branched fold for the "Total corners > 10" marquee, or keep the animated hero **single-stat** (byte-faithful to the verified `{1,1,7}` bundle) and demo corners only as predicate text? *Recommend single-stat hero.* *(Sec 4 OQ10.)*

11. **Half/period-scoped markets — confirm `ScoreStat.period` per statKey/phase (blocks authoring anything beyond full-match).** Phase-0 must confirm the exact `period` value `/api/scores/stat-validation` emits per statKey/phase (the leaf `period` must byte-match for `validate_stat` to return TRUE; the captured `{1,1,7}` is the only known-good). Until confirmed, **ship full-match markets only.** *(Sec 4 OQ11.)*

12. **TIER-1 enablement (post-Phase-0; blocks the catalog breadth).** After P0-d (two-stat `Add` lands) enable TIER-1a (corners/totals/cards); after P0-e (Subtract operand order — `A−B` vs `B−A`) enable TIER-1b (1X2/handicap, else they settle *backwards*). Confirm you want these pursued at all, or accept the **single-stat-only v1** floor and treat all TIER-1 as cut. *(Sec 3 §3.2/§3.8.)*