# Phase-0 Findings — ProofMarket Track-1 (Solana devnet parimutuel)

**Exit artifact per HACKATHON-BRIEF L14 (API-feedback deliverable).**
Frozen: 2026-07-01. Bundle identity: `fixtureId=18172280 seq=1068 statKey=1 epochDay=20634`.
On-chain root PDA: `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` (9232 B, owner `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`).

---

## Gate verdicts

### G1 — bool-oracle (P-adv-a): GO

Landed CPI into `validate_stat` returns a 1-byte bool via `get_return_data`.
TRUE → `AQ==` (0x01) / `PROBE_BOOL=1`; FALSE → `AA==` (0x00) / `PROBE_BOOL=0`.
Proven on a `--clone`'d devnet validator (probe `2aEdjbQjBAFE8wNyaF6JWuYWSfVaww4BsZotoGBNfa1b`).

### G2 — forged-proof (P-adv-b): GO

A tampered `stat_to_prove.value` AND a tampered `ProofNode.hash` EACH make the CPI REVERT
with `InvalidStatProof` (error 6023 / 0x1787) at Stage-1 Merkle reconstruction, BEFORE
predicate eval — so proof-invalid ≠ predicate-false ⇒ permissionless `resolve` is safe.

### G3 — finality: GO_CONSERVATIVE

`period` is the game-phase ID (ET1=7, F=5; soccer-feed.mdx); monotone-cumulative confirmed
across 163+ seqs for keys [1,2,7,8] (goals+corners; cards 3–6 excluded);
`terminal_semantics=per_seq_no_terminal` ⇒ `resolve` step-5 (`max_timestamp >= resolve_after_ts`)
is the mandatory soundness bind; ET-risk: a market with `stat_a_period=5` is unsettleable for
ET games ⇒ restrict v1 to group-stage (non-ET) fixtures.

### G4 — epoch-day: GO

Source locked to `ts` (no straddle in 109 bundles / 5 days); rule
`epoch_day = u16::try_from(ts/86_400_000).map_err(|_| WrongRootAccount)?`
(checked, never `as u16`).

### G5 — byte/CU budget: GO_WITH_CONSTRAINT

Worst-case proof tx (statProof=6 / subTree=13 / mainTree=7) = **1307 B > 1232**
(does NOT fit) → v1 MUST pin to low-event fixtures (`statProof+subTree+main ≤ 23 nodes`);
the real golden bundle = **878 B** (safe).
CU: inner `validate_stat` ≈ **205,264**; probe wrapper total ≈ **210,769**
(well under the 1.4M budget).

### G6 — frozen golden bundle (this gate): GO

`bundle.json` + `daily-root-account.json` committed. Bundle reconstructs to the on-chain
daily-root PDA from disk (no live endpoint): `returnData AQ==` (TRUE), `err null`,
`unitsConsumed 205,451`. Reproduction:

```
cd TxLINE/step1-spike
bun run reconstruct-golden.ts   # reads proofmarket/golden/bundle.json from disk
```

---

## API-feedback gaps (the deliverable's point)

**(a) Missing end-to-end CPI / `get_return_data` example for `validate_stat`.**
The devnet docs contain no example of calling `validate_stat` as a CPI and decoding
the returned bool via `get_return_data`. We had to reconstruct the discriminator +
return-decode pattern empirically (see `probe-cpi.ts`, `validate-sim.ts`).

**(b) Stale IDL in docs.**
The `idl/txoracle.json` v1.4.7 shipped in the docs MISSES `"returns": "bool"` on
`validate_stat` — only v1.5.2 (referenced in `devnet.mdx`) has it. Using the stale IDL
causes the Anchor client to silently fail to decode the return value; the call appears to
succeed but `returnData` is never surfaced. We vendored and patched
`proofmarket/idls/txoracle.json` to v1.5.2 to fix this.

---

## Reproduction summary

| Artefact | File | Size |
|---|---|---|
| Frozen proof bundle | `proofmarket/golden/bundle.json` | 7,101 B |
| On-chain root snapshot | `proofmarket/golden/daily-root-account.json` | 12,609 B |
| Phase-0 findings | `proofmarket/golden/PHASE0-FINDINGS.md` | (this file) |
| Spike (uncommitted) | `TxLINE/step1-spike/capture-golden.ts` | — |
| Reconstruction spike | `TxLINE/step1-spike/reconstruct-golden.ts` | — |

Devnet root account confirmed live at judging time: `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe`
is a permanent PDA under the txoracle program — it cannot be deleted or transferred.
The `/historical` endpoint may be unavailable Jul 19–29 (judging window), but reconstruction
runs entirely against the live devnet RPC (`https://api.devnet.solana.com`).
