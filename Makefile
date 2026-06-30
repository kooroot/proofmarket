# ProofMarket build/test/deploy wrappers.
#
# Why RUSTUP_TOOLCHAIN=stable: anchor-lang 0.31.1 transitively pulls edition2024 deps
# (blake3 / zerocopy via solana-program 2.x), which need rustc >= 1.85. `anchor build` builds
# in two toolchains:
#   1. The SBF program  -> `cargo build-sbf`, which forces the +solana platform-tools toolchain.
#      We pin that to v1.52 (rustc 1.89) in Cargo.toml [workspace.metadata.solana]. The CLI
#      +solana override means RUSTUP_TOOLCHAIN below does NOT affect this step.
#   2. The IDL (host)   -> anchor runs `cargo test --features idl-build` and, when RUSTUP_TOOLCHAIN
#      is unset, defaults it to `nightly`. On a machine whose nightly predates 1.85 this fails to
#      parse edition2024. Pinning to stable (>= 1.85) makes it deterministic.
export RUSTUP_TOOLCHAIN := stable

.PHONY: build test deploy clean lint

build:        ## Build SBF .so + IDL + TS types
	anchor build

test:         ## Build + run the test suite
	anchor test

deploy:       ## Deploy to devnet (needs a funded provider wallet)
	anchor deploy --provider.cluster devnet

clean:
	anchor clean
