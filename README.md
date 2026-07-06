# ProofMarket

**A Solana devnet parimutuel prediction market for the FIFA World Cup, settled by cryptographic Merkle proofs — no human vote, no dispute window.**

> _"No vote. No dispute window. Just math."_

ProofMarket is a submission for the **TxODDS World Cup Hackathon — Track 1 (Prediction Markets & Settlement)**. Every market is a [TxLINE](https://txodds.com) `validate_stat` predicate (e.g. _"Brazil scores > 1.5 goals"_), collateralized in a devnet test-USDC, and resolved by a **single on-chain CPI into TxLINE's `validate_stat`** — gated on a self-authenticating Merkle proof. No optimistic-oracle commit/reveal, no UMA-style voting, no dispute window. A forged proof simply reverts inside `validate_stat`.

The hero surface is a **"Proof Receipt"** that visualizes the full cryptographic resolution chain: stat leaf → eventStatRoot → fixture subtree → daily-root PDA → `validate_stat` TRUE → escrow release.

## 🔴 Live demo (devnet)

**https://proofmarket-tan.vercel.app** — one-click faucet mints 1,000 test-USDC (plus a small SOL gas grant, so judges need **no devnet SOL**), stake YES/NO on the open demo market, and watch the animated resolution walk at [/replay/18172280](https://proofmarket-tan.vercel.app/replay/18172280). Program [`6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb`](https://explorer.solana.com/address/6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb?cluster=devnet) on devnet; the full deployed-address table with Explorer permalinks is in [docs/DEPLOY-LOG.md](docs/DEPLOY-LOG.md).

> **Status: devnet settlement, play-money.** On-chain settlement moves only devnet test-USDC — never
> mainnet, never real funds. TxLINE data fetching can be pointed at mainnet World Cup tiers for
> event/proof discovery, but mainnet fund settlement would require a separate ProofMarket mainnet
> deployment compiled against the mainnet TxLINE oracle.

### Why the live market is OPEN, not Resolved — by design

`create_market` rejects any resolve time that isn't in the future (`resolve_after_ts_ms > now_ms`), and `resolve` requires the proof's `maxTimestamp >= resolve_after_ts` — the finality guard that stops a market from settling on a stale mid-match snapshot. The frozen golden proof is historical, so **no market creatable on the deployed program can ever be resolved by it**; staging a "live" resolve would mean weakening the exact check that makes settlement trustless. The complete resolve → claim leg instead reproduces deterministically in the hermetic replay below, and its cryptographic chain is what the live [/replay](https://proofmarket-tan.vercel.app/replay/18172280) page visualizes.

## One-command judge reproduction (hermetic — no validator, no network, no SOL)

```bash
git clone <repo> && cd proofmarket
yarn install
make build             # SBF .so + IDL + TS types — bankrun loads proofmarket + local txoracle fixture
yarn e2e-replay        # boots an in-process SVM and runs create → stake ×3 → resolve(validate_stat CPI) → claim
```

Prefer [Bun](https://bun.sh)? The whole repo is bun-first too: `bun install && make build && bun run e2e-replay`
(see **Running with Bun** below).

`make build` needs the pinned anchor + Solana SBF toolchain (see **Pinned toolchain** below); it wraps `anchor build` with the two env vars that make IDL generation deterministic (`RUSTUP_TOOLCHAIN=stable` + `CARGO_ENCODED_RUSTFLAGS=-Awarnings` — the latter suppresses the `procmacro2_semver_exempt` cfg that `anchor-lang-idl` injects and that otherwise breaks `#[derive(Accounts)]` hygiene). Use `make build`, not a bare `anchor build`. It is still fully hermetic — no validator, no RPC, no devnet SOL.

`yarn e2e-replay` then replays the frozen golden fixture entirely inside an **in-process Solana VM** (`solana-bankrun`): it loads the local ABI-compatible `txoracle` fixture program built by `make build` and the frozen daily-root account (`BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe`, epochDay 20634) from `tests/fixtures/`, so the exact settlement path reproduces forever — independent of devnet retention, with no local validator, no RPC, and no devnet SOL. The production CPI target is still the real devnet txoracle program id; the local fixture preserves the `validate_stat` discriminator, argument layout, and `bool` return-data contract for deterministic replay. It prints the full **Proof Receipt** (stat leaf → eventStatRoot → fixture sub-tree → daily-root PDA → `validate_stat` TRUE → escrow release), asserts the parimutuel settlement vector, and ends with:

> _No vote. No dispute window. Just math._

## Architecture

Three layers, with a single fund-moving trust surface:

1. **Ingestion Core** — TxLINE access (guest JWT → on-chain `subscribe` → activate → snapshot/SSE scores+odds decode → proof-bundle fetch).
2. **On-chain program** (`programs/proofmarket/`) — the _only_ trust surface that moves funds: an Anchor program holding USDC parimutuel pools that CPIs `txoracle::validate_stat` and reads its `bool` via `sol_get_return_data`.
3. **Off-chain** (`offchain/`) + **Frontend** (`web/`) — untrusted by construction: proofs are self-authenticating, so a malicious keeper cannot mis-settle.

## TxLINE mainnet data readiness

The submitted escrow is devnet, but the data path is network-aware:

```bash
npm run check-txline:mainnet
npm run check-txline:mainnet:live
```

The mainnet config follows the official World Cup docs: API host `https://txline.txodds.com`,
program `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`, TxL mint
`Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL`, and free World Cup service levels SL1
(60-second delay) and SL12 (real-time). Set `TXLINE_NETWORK=mainnet` plus a mainnet-activated
`TXLINE_JWT`/`TXLINE_API_TOKEN` to point the server-side `/api/txline/*` proxy at mainnet.

## Pinned toolchain (exact)

| Component | Version | Notes |
|-----------|---------|-------|
| Anchor (CLI + `anchor-lang`/`anchor-spl` + `@coral-xyz/anchor`) | **0.31.1** | matched triple; documented fallback `0.30.1` |
| Agave / Solana CLI + `cargo-build-sbf` | **2.1.0** | Anchor 0.31.x's recommended Solana toolchain (not `stable`/4.x) |
| `@solana/web3.js` | **^1.98.4** | v1 only (never v2) |
| `@solana/spl-token` | **0.4.14** | |
| `solana-bankrun` / `anchor-bankrun` / `spl-token-bankrun` | **0.4.0 / 0.5.0 / 0.2.6** | local-SVM integration tests |
| SBF build toolchain (`platform-tools`) | **v1.52** (rustc 1.89) | pinned in `Cargo.toml [workspace.metadata.solana]`; lowest release supporting edition2024 |

`anchor-lang 0.31.1` transitively pulls `edition2024` deps (`blake3` / `zerocopy` via `solana-program 2.x`), so the build needs rustc ≥ 1.85 in **two** places:

- **SBF program build** — `cargo build-sbf` uses platform-tools **v1.52** (pinned in `Cargo.toml`). Output is **SBPFv0** (`e_flags=0x0`), deployable on Agave 2.1.0 and current devnet.
- **IDL generation** — anchor's host-side `cargo test --features idl-build` defaults to the `nightly` toolchain; we pin it to **stable** (≥ 1.85) via `RUSTUP_TOOLCHAIN=stable`, wired into the `Makefile`.

Settlement target: the deployed `txoracle` program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` on Solana **devnet**.

## Building

```bash
make build     # anchor build → SBF .so + IDL + TS types
make test      # anchor test
make deploy    # anchor deploy --provider.cluster devnet
```

Bare `anchor build` works too, but first `export RUSTUP_TOOLCHAIN=stable` (see the toolchain note above) — the `Makefile` sets it for you.

`make deploy` reads a funded devnet keypair from `keys/devnet-deployer.json` (gitignored). Create or drop one there first:

```bash
solana-keygen new -o keys/devnet-deployer.json   # then fund via https://faucet.solana.com
```

## Test suite

| Command | Covers |
|---------|--------|
| `cargo test` | payout math (uneven pools, fee-on-loser, epoch/root guards) — pure-Rust unit tests |
| `anchor test --skip-local-validator` | hermetic in-process CPI E2E (create → stake → resolve → claim, TRUE + FALSE paths) |
| `yarn e2e-replay` | the golden Proof-Receipt reproduction (a focused single scenario of the above) |
| `cd web && npm install && npm test` | frontend — Proof-Receipt byte-equality render (Vitest) |

All on-chain tests run against an **in-process SVM (`solana-bankrun`)** — they need no local validator, no network, and no devnet SOL.

## Running with Bun

Every `yarn`/`npm` command in this README has a [Bun](https://bun.sh) equivalent (verified on bun ≥ 1.2;
`bun.lock` and `web/bun.lock` are committed for reproducible installs):

| Task | Bun command |
|------|-------------|
| install (root) | `bun install` |
| hermetic Proof-Receipt replay | `bun run e2e-replay` |
| full judge gate | `bun run judge-check` (add `CHECK_DEPLOY=1` for the live devnet check) |
| devnet deploy verification | `bun scripts/check-deploy.ts` — runs natively on the bun runtime, no ts-node |
| seed a demo market (funded wallet) | `bun scripts/seed.ts` |
| frontend | `cd web && bun install && bun run dev` (Next.js dev server; `bun run build` / `bun run test` likewise) |

Two notes: `bun install` in `web/` blocks a few dependency postinstalls by default
(`unrs-resolver`, `tiny-secp256k1`, …) — they are optional native helpers; typecheck, Vitest,
`next build`, and the dev server all pass without them. And `Anchor.toml`'s
`package_manager` stays `yarn` only because anchor-cli 0.31 doesn't accept bun there — it
only affects `anchor test`, which this repo doesn't use (the `Makefile` drives builds).

## Environment variables (documented here — `.env` files are not committed)

The hermetic reproduction above needs **none** of these; they are required only to run against live
TxLINE/Solana networks (deploy / keeper / frontend):

| Var | Purpose |
|-----|---------|
| `ANCHOR_PROVIDER_URL` | RPC for deploy (e.g. devnet `https://api.devnet.solana.com`) |
| `ANCHOR_WALLET` | path to the deploy keypair (`keys/devnet-deployer.json`) |
| `TXLINE_NETWORK` | TxLINE data API network for frontend server routes and offchain checks: `devnet` or `mainnet` |
| `TXLINE_JWT` | guest JWT from `POST /auth/guest/start` on the matching TxLINE host |
| `TXLINE_API_TOKEN` | pre-activated free SL1 `apiToken` (server-side only) |
| `FAUCET_AUTHORITY_SECRET` | **bs58-encoded** secret key of the test-USDC **mint authority** — the frontend faucet route signs `mintTo` + SOL gas grants with it (server-side only) |
| `PROOFMARKET_PROGRAM_ID` | program id for the offchain catalog helpers (optional; placeholder default when unset) |
| `NEXT_PUBLIC_RPC_URL` | devnet RPC for the frontend |
| `NEXT_PUBLIC_SETTLEMENT_TXLINE_NETWORK` | settlement oracle network for the deployed ProofMarket program; default `devnet` |
| `NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID` | deployed `proofmarket` program id |
| `NEXT_PUBLIC_USDC_MINT` | the pinned 6-dp test-USDC mint (`2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT`) |
| `NEXT_PUBLIC_FOLD_VERIFIED` | optional; `1` enables the in-browser "Verify in your browser" Merkle-fold toggle |

The deployed frontend at https://proofmarket-tan.vercel.app holds one pre-activated free SL1 `apiToken` server-side, so judges need **no purchase and no devnet SOL** to see data; a test-USDC **faucet** button funds a fresh wallet. Deployed addresses (program id, URL, market PDAs) are listed in `docs/DEPLOY.md` and `docs/DEPLOY-LOG.md`.

## License

[MIT](LICENSE)
