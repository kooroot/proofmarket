# ProofMarket

**A Solana devnet parimutuel prediction market for the FIFA World Cup, settled by cryptographic Merkle proofs — no human vote, no dispute window.**

> _"No vote. No dispute window. Just math."_

ProofMarket is a submission for the **TxODDS World Cup Hackathon — Track 1 (Prediction Markets & Settlement)**. Every market is a [TxLINE](https://txodds.com) `validate_stat` predicate (e.g. _"Brazil scores > 1.5 goals"_), collateralized in a devnet test-USDC, and resolved by a **single on-chain CPI into TxLINE's `validate_stat`** — gated on a self-authenticating Merkle proof. No optimistic-oracle commit/reveal, no UMA-style voting, no dispute window. A forged proof simply reverts inside `validate_stat`.

The hero surface is a **"Proof Receipt"** that visualizes the full cryptographic resolution chain: stat leaf → eventStatRoot → fixture subtree → daily-root PDA → `validate_stat` TRUE → escrow release.

> **Status: devnet only, play-money.** On-chain settlement moves only devnet test-USDC — never mainnet, never real funds. The hermetic reproduction below runs today with zero setup beyond `yarn install`; a live-devnet deployment is the final, funding-gated step.

## One-command judge reproduction (hermetic — no validator, no network, no SOL)

```bash
git clone <repo> && cd proofmarket
yarn install
yarn e2e-replay        # boots an in-process SVM and runs create → stake ×3 → resolve(validate_stat CPI) → claim
```

`yarn e2e-replay` replays the frozen golden fixture entirely inside an **in-process Solana VM** (`solana-bankrun`): it loads the committed `txoracle` program and the frozen daily-root account (`BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe`, epochDay 20634) from `tests/fixtures/`, so the exact resolution reproduces forever — independent of devnet retention, with no local validator, no RPC, and no devnet SOL. It prints the full **Proof Receipt** (stat leaf → eventStatRoot → fixture sub-tree → daily-root PDA → `validate_stat` TRUE → escrow release), asserts the parimutuel settlement vector, and ends with:

> _No vote. No dispute window. Just math._

## Architecture

Three layers, with a single fund-moving trust surface:

1. **Ingestion Core** — TxLINE access (guest JWT → on-chain `subscribe` → activate → snapshot/SSE scores+odds decode → proof-bundle fetch).
2. **On-chain program** (`programs/proofmarket/`) — the _only_ trust surface that moves funds: an Anchor program holding USDC parimutuel pools that CPIs `txoracle::validate_stat` and reads its `bool` via `sol_get_return_data`.
3. **Off-chain** (`offchain/`) + **Frontend** (`web/`) — untrusted by construction: proofs are self-authenticating, so a malicious keeper cannot mis-settle.

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

## Environment variables (documented here — `.env` files are not committed)

The hermetic reproduction above needs **none** of these; they are required only to run against **live devnet** (deploy / keeper / frontend):

| Var | Purpose |
|-----|---------|
| `ANCHOR_PROVIDER_URL` | RPC for deploy (e.g. devnet `https://api.devnet.solana.com`) |
| `ANCHOR_WALLET` | path to the deploy keypair (`keys/devnet-deployer.json`) |
| `TXLINE_HOST` | TxLINE API host |
| `TXLINE_JWT` | guest JWT from `POST /auth/guest/start` |
| `TXLINE_API_TOKEN` | pre-activated free SL1 `apiToken` (server-side only) |
| `KEEPER_KEYPAIR` | path to the resolver keypair that signs `resolve` |
| `NEXT_PUBLIC_RPC_URL` | devnet RPC for the frontend |
| `NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID` | deployed `proofmarket` program id |
| `NEXT_PUBLIC_USDC_MINT` | the pinned 6-dp test-USDC mint (`2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT`) |

For a deployed devnet demo the frontend holds one pre-activated free SL1 `apiToken` server-side, so judges need **no purchase and no devnet SOL** to see data; a test-USDC **faucet** button funds a fresh wallet. Deployed addresses (program id, URL, market PDAs) are listed in `docs/DEPLOY.md` once deployed.

## License

[MIT](LICENSE)
