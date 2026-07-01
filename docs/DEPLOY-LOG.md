# ProofMarket — Devnet Deployment Log

**Run date:** 2026-07-01 · **Cluster:** Solana **devnet** (test-USDC, no real money)
**Deploy wallet:** `7jKowNzrDTttsVEVGJzDpvX19H2hpWsxYcZix5feKxSg` (funded with 5 SOL)
**Result:** ✅ program deployed · pinned mint created · demo market seeded (golden 60/40) · all gates GREEN

This is the recorded, click-through-verifiable log of the funded devnet pass described in
[`DEPLOY.md`](./DEPLOY.md). Everything here is on-chain and permalinked — open any link to confirm.
The runbook itself is reproducible via the committed scripts: `yarn seed`, `yarn check-deploy`.

---

## TL;DR — verify in one command

```bash
yarn check-deploy      # read-only, no wallet needed
# → CHECK-DEPLOY: GO ✓ — live devnet surface verified
```

| What | Address | Explorer (devnet) |
|------|---------|-------------------|
| proofmarket program | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` | [open](https://explorer.solana.com/address/6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb?cluster=devnet) |
| test-USDC mint | `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT` | [open](https://explorer.solana.com/address/2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT?cluster=devnet) |
| **demo market (id 1)** | `DP4Jkxgm3sNvMKHbjCT1PQF7gCvaGcBMfFMCMkk4pkEP` | [open](https://explorer.solana.com/address/DP4Jkxgm3sNvMKHbjCT1PQF7gCvaGcBMfFMCMkk4pkEP?cluster=devnet) |
| market vault (100 USDC escrow) | `FriLxG49MbUouB1ixAona8ZNg4RJVzoVAmn9dULVzWzT` | [open](https://explorer.solana.com/address/FriLxG49MbUouB1ixAona8ZNg4RJVzoVAmn9dULVzWzT?cluster=devnet) |
| txoracle (settlement target) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | [open](https://explorer.solana.com/address/6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J?cluster=devnet) |
| daily-scores-root PDA (epochDay 20634) | `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` | [open](https://explorer.solana.com/address/BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe?cluster=devnet) |

---

## Step 1 — Build (`make build`)

SBF object + IDL + TS types. Program keypair pubkey matches `declare_id!`.

```
target/deploy/proofmarket.so   406504 bytes
target/idl/proofmarket.json    generated
program keypair pubkey         6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb  ✓ == declare_id
```

## Step 2 — Deploy the program (`make deploy`)

```
Program Id: 6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb
Signature : 594wuroznZVgWc9mRpKtcSvti3dSiqY7ioxAZ4zfwwRfYjKWpPvD4L1dxUU1fZCFo2nBqWU64oGwYWuJQEdxhFhA
```

On-chain confirmation (`solana program show 6QNd5…`):

| Field | Value |
|-------|-------|
| ProgramData | `B4BRMTq5qQSXGn6rCVoaNYGjbWeD38VpoCsprkc8QaYU` |
| Upgrade authority | `7jKowNzrDTttsVEVGJzDpvX19H2hpWsxYcZix5feKxSg` (deploy wallet) |
| Last deployed slot | 473252096 |
| Data length | 406504 bytes |

- Program: [explorer](https://explorer.solana.com/address/6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb?cluster=devnet)
- Deploy tx: [explorer](https://explorer.solana.com/tx/594wuroznZVgWc9mRpKtcSvti3dSiqY7ioxAZ4zfwwRfYjKWpPvD4L1dxUU1fZCFo2nBqWU64oGwYWuJQEdxhFhA?cluster=devnet)

> `anchor deploy` also attempts the other workspace programs; an unrelated `probe_validate` OOM
> at the very end is expected and irrelevant — the `proofmarket` deploy above succeeded.

## Step 3 — Create the pinned test-USDC mint (`spl-token create-token`)

Authority = the deploy wallet, so judges/the faucet can mint test-USDC without a separate keypair.

```
Address  : 2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT   ✓ == constants::USDC_MINT
Decimals : 6
Authority: 7jKowNzrDTttsVEVGJzDpvX19H2hpWsxYcZix5feKxSg
Signature: UhX8QkBgeS6G92eFq158CxQCfhtgvCjdWmvvejYQikVDyss7yibxPk4AhHyJ15xgMyNekpPoNoVgoiVG79EMVYV
```

- Mint: [explorer](https://explorer.solana.com/address/2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT?cluster=devnet)
- Create tx: [explorer](https://explorer.solana.com/tx/UhX8QkBgeS6G92eFq158CxQCfhtgvCjdWmvvejYQikVDyss7yibxPk4AhHyJ15xgMyNekpPoNoVgoiVG79EMVYV?cluster=devnet)

## Step 4 — Seed the demo market (`yarn seed` + `finish-seed.ts`)

One market (id 1), golden **60 YES / 40 NO** vector across **3 positions**. Burners funded from the
deploy wallet (not airdrops), USDC minted with the deploy wallet as authority. The public devnet RPC
threw `429 Too Many Requests` after the first two stakes; `scripts/finish-seed.ts` resumed
idempotently and added the missing NO stake.

| Item | Address / value |
|------|-----------------|
| market PDA (id 1) | `DP4Jkxgm3sNvMKHbjCT1PQF7gCvaGcBMfFMCMkk4pkEP` |
| createMarket tx | [`hYXJHZL8…`](https://explorer.solana.com/tx/hYXJHZL8BhtxqWUr7LBu7A5vejgwVodEoLufV4BCcBPParTgZvLSa2nMNew4E1bdWw1t6wxRPS17GQ4hpdUpRBP?cluster=devnet) |
| feeDestination (deployer ATA) | `8Gbbg9NPnWsbJAwyokoMLBzKeCgasbJgwTU4peiCWKLR` |
| vault | `FriLxG49MbUouB1ixAona8ZNg4RJVzoVAmn9dULVzWzT` |

Stakes (each a distinct burner wallet):

| Staker | Side | Amount | Wallet | Stake tx |
|--------|------|--------|--------|----------|
| A | YES | 40 USDC | `562SENyG2F6Ct31CLmC3qbQqCGMcdDTsgnXY74GZ8Qq9` | [`4fNA2Hr…`](https://explorer.solana.com/tx/4fNA2HrVX6xsf1abBqy7Ww4NWbY2vAa6wrPsTbRkZGY8hbfyvCijfLXoSrChuPcFvxxYV386ZtbxaK6W3VPJWgAh?cluster=devnet) |
| C | YES | 20 USDC | `6GUj26v5y7AQ7NMjV6raDHKcveTcoKBbGwXqAQsjqQFQ` | [`2kyBimbo…`](https://explorer.solana.com/tx/2kyBimboQ3LG6Q1LJy1AtcbK79b9fQRdwSBRjtDAArXK887whz43bL2bQFwjQc8aWJSMLVgCA61twjWNpWGA4nj2?cluster=devnet) |
| B | NO | 40 USDC | `8NbQPdbuPYKAjecHvpKMJFRgC2n44xVdDkBmaXBakKTz` | [`5aq1K5c…`](https://explorer.solana.com/tx/5aq1K5c85fEW2b1VZoqcV4tMTagadjzcRiXW9BNRbebydzPAt9V8jHXJGFLR4saTNrZEoippJLQgcJhnvpW2jEha?cluster=devnet) |

Final on-chain market state (from `finish-seed.ts` + `check-deploy.ts`):

```
state        : 0 (OPEN)
yesPool      : 60000000   (60 USDC)
noPool       : 40000000   (40 USDC)
totalPositions: 3
vault        : 100000000  (100 USDC escrowed)
feeBps       : 100 (1%)
```

**Why OPEN and not Resolved:** the golden proof's `max_timestamp` is historical (≈2026-06-30),
so resolve's finality gate (`max_timestamp >= resolve_after_ts`) cannot be satisfied for a market
whose `resolve_after_ts` is in the future. A live-devnet resolve is therefore impossible with this
proof by design — the resolved **Proof Receipt** is produced hermetically via `yarn e2e-replay`
against a clock-controlled sandbox that clones the same daily-root.

## Step 5 — Verify the live surface (`yarn check-deploy`)

Read-only, no wallet. Exit 0 = GO.

```
== ProofMarket devnet deploy check (https://api.devnet.solana.com) ==
  ✓ proofmarket program deployed at declare_id  — 36B, executable
  ✓ pinned test-USDC mint  — decimals 6, authority 7jKowNzr…
  ✓ canonical txoracle daily-scores root (settlement anchor)  — owner 6pW64gN1…
  ✓ demo market seeded + OPEN  — state 0
  ✓ golden pools (YES 60 / NO 40 USDC)  — YES 60 / NO 40
  ✓ 3 staked positions  — pos 3
  ✓ vault holds 100 USDC escrow  — 100 USDC
  market PDA: DP4Jkxgm3sNvMKHbjCT1PQF7gCvaGcBMfFMCMkk4pkEP
CHECK-DEPLOY: GO ✓ — live devnet surface verified
```

## Full gate — hermetic + live in one command (`CHECK_DEPLOY=1 yarn judge-check`)

```
== repo hygiene ==                       ✓ PASS
== demo script ==                        ✓ PASS
== tech endpoints ==                     ✓ PASS
== api feedback ==                       ✓ PASS
== frontend Proof-Receipt (vitest) ==    ✓ PASS
== hermetic E2E replay (bankrun) ==      ✓ PASS (4 passing)
== devnet deploy GO ==                   ✓ PASS (live devnet surface verified — scripts/check-deploy.ts)
JUDGE-CHECK: ALL GATES GREEN (devnet deploy is LIVE) — submission gate PASS
```

## SOL accounting (deploy wallet `7jKow…`)

| Milestone | Balance |
|-----------|---------|
| After 5 SOL funding | ~5.10 SOL |
| After program deploy | 0.94865784 SOL |
| After mint + seed (final) | 0.85138948 SOL |

Program rent (~2.83 SOL) is held by the ProgramData account and is recoverable on close; the
remaining balance covers many redeploys. No real funds involved — devnet + test-USDC only.

## What remains (needs your accounts, not automatable here)

- **Frontend deploy (Vercel):** run `DEPLOY.md` Step 5 with your Vercel account + server-only
  `TXLINE_API_TOKEN` / `KEEPER_KEYPAIR`. Point it at the addresses above
  (`NEXT_PUBLIC_DEMO_MARKET=DP4Jkxgm…`). This produces the click-through demo URL for judges.
