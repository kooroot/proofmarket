# Deploying ProofMarket to devnet (funding-gated)

> **You do not need any of this to reproduce the Proof Receipt.** The hermetic
> replay (`yarn e2e-replay`) runs the full create → stake → resolve (`validate_stat`
> CPI) → claim entirely in an in-process SVM — no validator, no RPC, no devnet SOL.
> This runbook is only for standing up the **live devnet demo** (a deployed URL with a
> pre-seeded market) that judges can click through.

Everything below requires **real devnet SOL** and a couple of local keypairs, so it is
the one part of the build that cannot be automated — it is your funded pass. Each step
lists its own GO check.

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
spl-token create-token --decimals 6 keys/usdc-mint.json -u devnet
```
GO: the printed token address == `USDC_MINT` (`2MYAvD…HA8LT`).
**Alt (no pinned keypair):** `spl-token create-token --decimals 6 -u devnet` → record the new address and use it everywhere `NEXT_PUBLIC_USDC_MINT` appears below.

## Step 3 — Deploy the program (reuse the same program keypair forever)

```bash
make deploy    # anchor deploy --provider.cluster devnet
```
GO: `Program Id: 6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` (matches `declare_id!`), `Deploy success`.
Back up `target/deploy/proofmarket-keypair.json` — redeploys must reuse it to avoid re-paying program rent.

## Step 4 — Seed one demo market (create + a fixed 4-staker YES/NO split)

Create `scripts/seed.ts` with the following, then `yarn add -D ts-node` (already a devDep) and
run it. This mirrors the hermetic `runEndToEnd` (scripts/lib/replay-run.ts) against **live**
devnet. **Note:** the amounts below are in 6-dp base units and are all ≥ `MIN_STAKE` (1 000);
do **not** use sub-1 000 stakes — the program rejects them with `StakeTooSmall` (6103). The
split reproduces the golden 60 YES / 40 NO demo vector.

```ts
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { readFileSync } from "fs";

const MINT = new PublicKey("2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT"); // == constants::USDC_MINT
const FIXTURE_ID = new BN(18172280);   // golden fixture (G6 bundle)
const STAT_KEY = 1, STAT_PERIOD = 7;   // golden goals stat (monotone)
const FEE_BPS = 100;                    // 1% (matches the golden Proof Receipt)

(async () => {
  const provider = anchor.AnchorProvider.env(); anchor.setProvider(provider);
  const program = anchor.workspace.Proofmarket as anchor.Program<any>;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const mintAuth = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync("./keys/usdc-mint.json", "utf8"))));

  const id = new BN(Date.now());
  const seed = (t: string, k: Buffer[]) => PublicKey.findProgramAddressSync([Buffer.from(t), ...k], program.programId)[0];
  const market = seed("market", [id.toArrayLike(Buffer, "le", 8)]);
  const vault = seed("vault", [market.toBuffer()]);
  const feeDest = await createAssociatedTokenAccount(provider.connection, payer, MINT, payer.publicKey);

  await program.methods
    .createMarket(id, FIXTURE_ID, STAT_KEY, STAT_PERIOD, 0, 0, new BN(Date.now() + 3_600_000), FEE_BPS)
    .accounts({ creator: payer.publicKey, market, vault, mint: MINT, feeDestination: feeDest }).rpc();

  // YES 40 + 20 = 60 USDC, NO 30 + 10 = 40 USDC — all ≥ MIN_STAKE, both sides non-zero (never Void).
  const split: [boolean, number][] = [[true, 40_000_000], [true, 20_000_000], [false, 30_000_000], [false, 10_000_000]];
  for (const [side, amount] of split) {
    const u = Keypair.generate();
    // devnet airdrops throttle; if this rejects, fund from your deploy wallet:
    //   solana transfer <u.pubkey> 0.05 --allow-unfunded-recipient
    await provider.connection.requestAirdrop(u.publicKey, 5e7);
    await new Promise((r) => setTimeout(r, 1500));
    const ata = await createAssociatedTokenAccount(provider.connection, payer, MINT, u.publicKey);
    await mintTo(provider.connection, payer, MINT, ata, mintAuth, amount);
    const position = seed("position", [market.toBuffer(), u.publicKey.toBuffer()]);
    await program.methods.stake(side, new BN(amount))
      .accounts({ user: u.publicKey, market, position, vault, userTokenAccount: ata, mint: MINT }).signers([u]).rpc();
    console.log(`staked ${side ? "YES" : "NO"} ${amount / 1e6} USDC from ${u.publicKey.toBase58()}`);
  }
  console.log("seeded market:", market.toBase58());
})();
```

```bash
yarn ts-node scripts/seed.ts        # or add "seed": "ts-node scripts/seed.ts" to package.json
```
GO: four `staked …` lines + `seeded market: <pubkey>`; `program.account.market.fetch(<pubkey>)`
shows `yesPool 60_000_000`, `noPool 40_000_000`, `totalPositions 4`.

Resolution of a demo market is intentionally kept off live-devnet — run it against a
**clock-controlled sandbox** that clones the daily-root, exactly as the hermetic
`resolve` path does (never a real live-devnet resolve), so the finality-time gate is satisfiable.

## Step 5 — Point the frontend at your deployment

Set these in the frontend host (Vercel project env, or `web/.env.local` for a local run):

| Var | Value |
|-----|-------|
| `NEXT_PUBLIC_RPC_URL` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID` | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` |
| `NEXT_PUBLIC_USDC_MINT` | `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT` (or your Step-2-alt mint) |

Server-only vars (never `NEXT_PUBLIC_`): `TXLINE_API_TOKEN` (a pre-activated free SL1 token so
judges need no purchase), `KEEPER_KEYPAIR`. See the README env table.

```bash
cd web && npm install && npm run build && vercel --prod   # or your host of choice
```

## Deployed addresses (fill in after your funded run)

| Item | Value |
|------|-------|
| proofmarket program id | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` |
| txoracle (settlement target, devnet) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| daily-scores-root PDA (epochDay 20634) | `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` |
| test-USDC mint | `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT` |
| seeded demo market PDA | _(from Step 4)_ |
| deployed frontend URL | _(from Step 5)_ |
| resolve tx (Explorer permalink) | _(after sandbox resolve)_ |
