# ProofMarket

**A Solana devnet parimutuel prediction market for the FIFA World Cup, settled by cryptographic Merkle proofs — no human vote, no dispute window.**

> _"No vote. No dispute window. Just math."_

ProofMarket is a submission for the **TxODDS World Cup Hackathon — Track 1 (Prediction Markets & Settlement)**. Every market is a [TxLINE](https://txodds.com) `validate_stat` predicate (e.g. _"Brazil scores > 1.5 goals"_), collateralized in a devnet test-USDC, and resolved by a **single on-chain CPI into TxLINE's `validate_stat`** — gated on a self-authenticating Merkle proof. No optimistic-oracle commit/reveal, no UMA-style voting, no dispute window. A forged proof simply reverts inside `validate_stat`.

The hero surface is a **"Proof Receipt"** that visualizes the full cryptographic resolution chain: stat leaf → eventStatRoot → fixture subtree → daily-root PDA → `validate_stat` TRUE → escrow release.

> **Status: under active construction (devnet only, play-money).** This repository is being built phase-by-phase from the implementation plan in [`docs/`](docs/). On-chain settlement moves only devnet test-USDC — never mainnet, never real funds.

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

## License

[MIT](LICENSE)
