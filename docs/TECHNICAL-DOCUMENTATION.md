# ProofMarket Technical Documentation

ProofMarket is a Solana devnet parimutuel prediction market for World Cup football data. It lets users stake test-USDC on YES/NO outcomes, then resolves markets by calling TxLINE's on-chain `validate_stat` primitive with cryptographic sports-data proofs.

The core design goal is simple: settlement should come from verifiable match data, not from human voting, an optimistic dispute window, or a centralized admin decision.

## Submission Links

| Item | Link |
| --- | --- |
| Live MVP | https://proofmarket-tan.vercel.app |
| Public repository | https://github.com/kooroot/proofmarket |
| Animated proof replay | https://proofmarket-tan.vercel.app/replay/18172280 |
| Devnet ProofMarket program | https://explorer.solana.com/address/6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb?cluster=devnet |

ProofMarket is a devnet demo. It uses play-money test-USDC only, never real funds.

## Track Fit

ProofMarket targets the TxODDS World Cup Hackathon Track 1 prediction-market settlement use case:

- Prediction market UX: users can inspect a football market, see YES/NO pools, connect a wallet or use the guest wallet flow, receive test funds, and stake.
- TxLINE integration: markets are represented as TxLINE-compatible stat predicates, such as a team-goals or match-winner condition.
- Verifiable settlement: the on-chain program resolves by performing a CPI into TxLINE `validate_stat` and reading the returned boolean.
- Judge reproducibility: the full settlement path can be replayed locally with a frozen proof bundle and an in-process Solana VM.

## Architecture

ProofMarket has three layers:

1. `programs/proofmarket/`
   - Anchor 0.31.1 Solana program.
   - Owns market state, positions, vaults, parimutuel accounting, refunds, claims, and settlement.
   - The only layer allowed to move escrowed funds.

2. `offchain/` and `scripts/`
   - Fetch and normalize TxLINE fixtures, scores, odds, proof bundles, and replay artifacts.
   - Build golden fixtures for deterministic local verification.
   - Provide judge and deployment checks.

3. `web/`
   - Next.js frontend deployed on Vercel.
   - Provides the live devnet market UI, faucet, guest wallet entry points, stake flow, replay visualization, and server-side TxLINE proxy routes.

The frontend and keeper are intentionally not trusted for settlement correctness. They can submit proof data, but the on-chain program rebuilds the expected predicate from stored market state and relies on TxLINE proof verification before releasing escrow.

## TxLINE Data Flow

ProofMarket uses TxLINE for both live market data and settlement proof data.

The access flow is:

1. Start a guest session with `POST /auth/guest/start`.
2. Subscribe to the relevant service level through the TxLINE on-chain program.
3. Activate the subscription to receive an `apiToken`.
4. Fetch fixtures, scores, odds, and proof bundles with both `Authorization: Bearer <jwt>` and `X-Api-Token: <apiToken>`.

The main data endpoints used by ProofMarket are:

| Purpose | Endpoint |
| --- | --- |
| Fixture discovery | `GET /api/fixtures/snapshot` |
| Live score stream | `GET /api/scores/stream` |
| Historical score updates | `GET /api/scores/updates/{epochDay}/{hour}/{interval}` |
| Fixture history | `GET /api/scores/historical/{fixtureId}` |
| Settlement proof bundle | `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=` |

The submitted escrow deployment targets TxLINE devnet:

| Item | Value |
| --- | --- |
| TxLINE devnet API | `https://txline-dev.txodds.com` |
| TxLINE devnet program | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| ProofMarket devnet program | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` |

The ingestion code is network-aware and can point at TxLINE mainnet World Cup tiers for data discovery, but real-fund mainnet settlement would require a separate ProofMarket mainnet deployment compiled against the mainnet TxLINE oracle.

## Settlement Proof Path

A ProofMarket market stores the settlement predicate in its on-chain state. At resolution time, the caller supplies a TxLINE proof bundle, but the caller is not trusted to define the market outcome.

The proof path is:

1. TxLINE stat leaf: a fixture stat such as `participant1 total goals`.
2. `eventStatRoot`: Merkle root for event stats.
3. Fixture subtree root.
4. Daily root PDA owned by the TxLINE oracle.
5. `validate_stat` CPI returns `true` or `false`.
6. ProofMarket records the outcome and enables winner claims.

The proof bundle includes:

- `fixtureSummary`
- `eventStatRoot`
- `statProof`
- `subTreeProof`
- `mainTreeProof`

The daily root PDA is derived from:

```text
["daily_scores_roots", epochDay u16 little-endian]
```

For the frozen replay fixture, the verified daily-root PDA is:

```text
BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe
```

## On-Chain Settlement Logic

The key instruction is `resolve`.

At a high level, `resolve`:

1. Checks the market is eligible for settlement.
2. Rebuilds the expected TxLINE predicate from on-chain market state.
3. Invokes TxLINE `validate_stat` as an inner instruction.
4. Reads the returned boolean through Solana return data.
5. Stores the resolved outcome.
6. Allows winning positions to claim from the parimutuel vault.

Important implementation details:

- `validate_stat` is a boolean oracle, not an assert-or-revert oracle.
- A successful transaction does not automatically mean the predicate is true.
- ProofMarket must decode `sol_get_return_data`; `AQ==` means true and `AA==` means false.
- The real devnet `validate_stat` path uses about 205k compute units, so ProofMarket requests an explicit compute budget.
- Caller-supplied predicates are not trusted; the market's stored predicate is authoritative.
- Stale settlement is blocked by a finality guard requiring the proof timestamp range to cover the market's `resolve_after_ts`.

## Market Model

ProofMarket currently supports parimutuel YES/NO markets backed by devnet test-USDC.

Supported market shapes include:

| Market type | Predicate shape |
| --- | --- |
| Match winner | `participant1 goals - participant2 goals > 0` |
| Over / under goals | `participant1 goals + participant2 goals > threshold` |
| Team goals | `participant total goals > threshold` |
| Corners micro market | `participant1 corners - participant2 corners > 0` |

The live demo market is intentionally left open. The historical golden proof used for the replay cannot resolve a newly-created live market without weakening the timestamp finality check, so the resolved proof receipt is shown through the deterministic replay path.

## Frontend and UX

The deployed frontend is designed for judge access without setup:

- Public Vercel URL with no team SSO requirement.
- Guest/burner wallet entry points.
- Faucet for 1,000 test-USDC and a small SOL gas grant.
- Market detail page with YES/NO pool state and settlement metadata.
- Replay page that visualizes the proof chain from stat leaf to escrow release.

The replay UI exists because the most important part of the project is not just staking, but showing why the settlement result is cryptographically grounded.

## Reproducibility

The judge path is:

```bash
git clone https://github.com/kooroot/proofmarket.git
cd proofmarket
yarn install
make build
yarn e2e-replay
```

`yarn e2e-replay` runs the settlement scenario in an in-process Solana VM using frozen fixtures. It covers:

- market creation
- staking
- TxLINE-compatible proof validation
- `validate_stat` CPI
- return-data decoding
- parimutuel settlement
- winner claim

For live deployment verification:

```bash
CHECK_DEPLOY=1 yarn judge-check
```

## Testing and Quality Gates

The repository includes:

- Rust unit tests for payout math and guard logic.
- Anchor/bankrun tests for create, stake, resolve, claim, refund, and close flows.
- TxLINE network checks for devnet/mainnet endpoint configuration.
- Golden fixture tests for deterministic proof data.
- Frontend Vitest coverage for proof receipt rendering and market calculations.
- Deployment checks for program id, mint, faucet authority, market state, vault balances, and TxLINE daily root availability.

## Security and Trust Assumptions

ProofMarket's trusted fund-moving surface is the on-chain program plus the TxLINE oracle program. The frontend, keeper, and user-submitted proof payloads are not trusted.

Key protections:

- Market predicates are stored on-chain and rebuilt during settlement.
- The TxLINE daily-root PDA must exist and be owned by the oracle.
- The settlement result comes from TxLINE return data.
- The test-USDC faucet authority is separated from the program upgrade authority.
- The demo uses devnet test funds only.

Known limitation:

- The current submitted deployment is devnet-only. Mainnet data access is supported for discovery, but real-fund settlement would require a mainnet ProofMarket deployment targeting the mainnet TxLINE program.

## Additional Documentation

- [TxLINE endpoints and CPI details](./TECH-ENDPOINTS.md)
- [TxLINE API feedback and integration notes](./API-FEEDBACK.md)
- [Devnet deployment log](./DEPLOY-LOG.md)
- [Submission checklist and market taxonomy](./SUBMISSION-CHECKLIST.md)
- [Demo script and shot list](./DEMO-SCRIPT.md)
