# Deploying ProofMarket to devnet (funding-gated)

> **You do not need any of this to reproduce the Proof Receipt.** The hermetic
> replay (`yarn e2e-replay`) runs the full create → stake → resolve (`validate_stat`
> CPI) → claim entirely in an in-process SVM — no validator, no RPC, no devnet SOL.
> This runbook is only for standing up the **live devnet demo** (a deployed URL with a
> pre-seeded market) that judges can click through.

Everything below requires **real devnet SOL** and a couple of local keypairs, so it is
the one part of the build that cannot be automated — it is your funded pass. Each step
lists its own GO check. **This runbook was executed on 2026-07-01 — see the recorded run
in [`DEPLOY-LOG.md`](./DEPLOY-LOG.md) and the filled-in address table at the bottom.**

## Prerequisites

| Need | How |
|------|-----|
| A funded deploy wallet (~5 SOL; a parimutuel `.so` + redeploys cost a few recoverable SOL) | `solana-keygen new -o keys/devnet-deployer.json` then fund at https://faucet.solana.com (airdrops throttle — top up over a few minutes) |
| The pinned test-USDC **mint-authority** keypair (`keys/usdc-mint.json`, gitignored) | If you have it, its pubkey must equal `USDC_MINT` = `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT`. If you do **not** have it, create a fresh mint (Step 2 alt) and use that address for `NEXT_PUBLIC_USDC_MINT` instead of the pinned one. |
| Solana + Anchor toolchain on PATH | see **Pinned toolchain** in the README |

Point the CLI at devnet + your deploy wallet:

```bash
solana config set --url https://api.devnet.solana.com --keypair keys/devnet-deployer.json
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=$PWD/keys/devnet-deployer.json
```

## Step 1 — Build

```bash
make build     # SBF .so + IDL + TS types (sets the RUSTUP_TOOLCHAIN/CARGO_ENCODED_RUSTFLAGS the IDL step needs)
```
GO: `target/deploy/proofmarket.so` and `target/idl/proofmarket.json` exist.

## Step 2 — (Re)create the pinned test-USDC mint

```bash
spl-token create-token --decimals 6 keys/usdc-mint.json -u devnet \
  --mint-authority 7jKowNzrDTttsVEVGJzDpvX19H2hpWsxYcZix5feKxSg   # the deploy wallet mints test-USDC
```
GO: the printed token address == `USDC_MINT` (`2MYAvD…HA8LT`).
**Alt (no pinned keypair):** `spl-token create-token --decimals 6 -u devnet` → record the new address and use it everywhere `NEXT_PUBLIC_USDC_MINT` appears below.

## Step 3 — Deploy the program (reuse the same program keypair forever)

```bash
make deploy    # anchor deploy --provider.cluster devnet
```
GO: `Program Id: 6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` (matches `declare_id!`), `Deploy success`.
Back up `target/deploy/proofmarket-keypair.json` — redeploys must reuse it to avoid re-paying program rent.
(`anchor deploy` also tries to deploy the other workspace programs; only `proofmarket` matters — an
unrelated `probe_validate` OOM at the end is expected and does not affect the `proofmarket` deploy.)

## Step 4 — Seed one demo market (create + a fixed 3-staker YES/NO split)

`scripts/seed.ts` (committed + tested) mirrors the hermetic `runEndToEnd` against **live** devnet:
it creates one market (id 1) and stakes the golden **60 YES / 40 NO** vector — A 40 + C 20 YES,
B 40 NO. All stakes are ≥ `MIN_STAKE` (1 000); sub-1 000 stakes are rejected `StakeTooSmall` (6103).
Burners are funded from the **deploy wallet** via `SystemProgram.transfer` (devnet airdrops throttle),
and test-USDC is minted with the deploy wallet as mint authority.

```bash
yarn seed        # ANCHOR_PROVIDER_URL + ANCHOR_WALLET exported (see Prerequisites)
```
GO: `SEED OK ✓ (YES 60 / NO 40 / 3 positions / vault 100 USDC)`. If the **public** devnet RPC
returns `429 Too Many Requests` mid-run (it rate-limits bursts), `yarn ts-node scripts/finish-seed.ts`
resumes idempotently — it re-reads the market and adds only the still-missing NO stake.

The market is left **OPEN** (`resolve_after_ts` = now + 30 d). A live resolve is intentionally NOT
performed: the golden proof's `max_timestamp` is historical, so resolve's finality gate
(`max_timestamp >= resolve_after_ts`) cannot hold against a future `resolve_after_ts` without a
controllable clock. The resolved Proof Receipt is therefore produced hermetically (`yarn e2e-replay`)
against a **clock-controlled sandbox** that clones the daily-root — never a live-devnet resolve.

## Step 4b — Verify the live surface (read-only, no wallet)

```bash
yarn check-deploy                 # or: CHECK_DEPLOY=1 yarn judge-check  (folds it into the full gate)
```
GO: `CHECK-DEPLOY: GO ✓` — asserts the program is deployed at `declare_id`, the pinned mint exists
(decimals 6, authority = deploy wallet), the canonical txoracle daily-root is present (settlement
anchor), and the seeded market is OPEN with YES 60 / NO 40 / 3 positions / vault 100 USDC.

## Step 5 — Point the frontend at your deployment

Set these in the frontend host (Vercel project env, or `web/.env.local` for a local run):

| Var | Value |
|-----|-------|
| `NEXT_PUBLIC_RPC_URL` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID` | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` |
| `NEXT_PUBLIC_USDC_MINT` | `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT` (or your Step-2-alt mint) |
| `NEXT_PUBLIC_DEMO_MARKET` | `DP4Jkxgm3sNvMKHbjCT1PQF7gCvaGcBMfFMCMkk4pkEP` (the seeded OPEN market) |

Server-only vars (never `NEXT_PUBLIC_`): `TXLINE_API_TOKEN` (a pre-activated free SL1 token so
judges need no purchase), `KEEPER_KEYPAIR`. See the README env table.

```bash
cd web && npm install && npm run build && vercel --prod   # or your host of choice
```

## Deployed addresses (recorded 2026-07-01 — full run log in DEPLOY-LOG.md)

| Item | Value |
|------|-------|
| proofmarket program id | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` |
| — program deploy tx | `594wuroznZVgWc9mRpKtcSvti3dSiqY7ioxAZ4zfwwRfYjKWpPvD4L1dxUU1fZCFo2nBqWU64oGwYWuJQEdxhFhA` |
| — upgrade authority | `7jKowNzrDTttsVEVGJzDpvX19H2hpWsxYcZix5feKxSg` (deploy wallet) |
| txoracle (settlement target, devnet) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| daily-scores-root PDA (epochDay 20634) | `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` |
| test-USDC mint | `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT` |
| — mint create tx | `UhX8QkBgeS6G92eFq158CxQCfhtgvCjdWmvvejYQikVDyss7yibxPk4AhHyJ15xgMyNekpPoNoVgoiVG79EMVYV` |
| seeded demo market PDA (id 1) | `DP4Jkxgm3sNvMKHbjCT1PQF7gCvaGcBMfFMCMkk4pkEP` |
| — market vault PDA | `FriLxG49MbUouB1ixAona8ZNg4RJVzoVAmn9dULVzWzT` |
| — createMarket tx | `hYXJHZL8BhtxqWUr7LBu7A5vejgwVodEoLufV4BCcBPParTgZvLSa2nMNew4E1bdWw1t6wxRPS17GQ4hpdUpRBP` |
| deployed frontend URL | _(Vercel — run Step 5 with your account)_ |
| resolve tx (Explorer permalink) | _hermetic only — `yarn e2e-replay` (live-devnet resolve is impossible against the historical golden proof; by design)_ |

Explorer: append `?cluster=devnet` to any `https://explorer.solana.com/address/<pubkey>` or
`https://explorer.solana.com/tx/<sig>` link above.
