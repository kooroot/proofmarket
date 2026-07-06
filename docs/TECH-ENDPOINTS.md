# ProofMarket — TxLINE Endpoints & On-Chain CPI Used

All data calls send BOTH `Authorization: Bearer <jwt>` and `X-Api-Token: <apiToken>`.

## 0. Network matrix

ProofMarket now treats TxLINE's data/API network as configurable. The submitted escrow deployment is
still devnet, but the same proxy/ingestion path can point at the official mainnet World Cup tier.

| Network | API host | Solana RPC | TxLINE program | TxL mint | Free World Cup service levels |
| --- | --- | --- | --- | --- | --- |
| devnet | `https://txline-dev.txodds.com` | `https://api.devnet.solana.com` | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | `4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG` | SL1, 60-second delay |
| mainnet | `https://txline.txodds.com` | `https://api.mainnet-beta.solana.com` | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` | `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL` | SL1, 60-second delay; SL12, real-time |

Mainnet World Cup data is therefore fetchable by setting `TXLINE_NETWORK=mainnet` and using a
mainnet-activated JWT/API token. The official FAQ says the API does not impose call rate limits, but
that is not "unlimited everything": it is scoped to the subscribed World Cup/International
Friendlies tiers, depends on a valid activated token, and settlement proofs must be validated against
the matching on-chain TxLINE program and daily-root PDA.

Dry-run config check:

```bash
npm run check-txline:mainnet
```

Live check, including mainnet program account and guest auth:

```bash
npm run check-txline:mainnet:live
```

Authenticated data check:

```bash
TXLINE_JWT=... TXLINE_API_TOKEN=... npm run check-txline -- --network mainnet --live --require-token --path /api/fixtures/snapshot
```

## 1. Access model — the 4-step auth flow (free SL1 / mainnet SL1 or SL12)
1. `POST {host}/auth/guest/start` -> guest JWT (`resp.data.token`). (No `/api` prefix.)
2. (paid only — SKIPPED for free World Cup tiers) `POST {host}/api/guest/purchase/quote`.
3. on-chain `txoracle.methods.subscribe(serviceLevelId, weeks).rpc()` -> txSig (free subscribe still posts on-chain, no token transfer).
4. ed25519-sign `${txSig}:${leagues.join(",")}:${jwt}` (empty leagues -> `${txSig}::${jwt}`), then
   `POST {host}/api/token/activate {txSig, walletSignature, leagues}` + Bearer JWT -> `apiToken`.

The host, RPC, TxLINE program id, TxL mint, subscribe transaction, JWT, and activation endpoint must
all be for the same network. A devnet subscribe tx cannot activate against the mainnet host.

## 2. Data APIs used
- `GET /api/fixtures/snapshot[?competitionId=]` — fixtures / participant names / FixtureId / StartTime.
- `GET /api/scores/stream` (SSE: `Accept: text/event-stream`, `Cache-Control: no-cache`) — live clock + Stats{} for the in-play UI.
- `GET /api/scores/updates/{epochDay}/{hour}/{interval}` and `GET /api/scores/historical/{fixtureId}` — FT detection / replay capture.
- `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=` — THE proof bundle: `{ ts, statToProve{key,value,period}, eventStatRoot[32], summary{fixtureId, updateStats{updateCount:i32,minTimestamp,maxTimestamp}, eventStatsSubTreeRoot[32]}, statProof[], subTreeProof[], mainTreeProof[] }`.
  - JSON->Anchor adapter: `subTreeProof` -> arg `fixture_proof`; `eventStatsSubTreeRoot` -> `eventsSubTreeRoot`; `updateStats.update_count` is `i32`.

## 3. On-chain proof primitive (the read in `resolve`)
- Daily-root PDA: seeds `["daily_scores_roots", epoch_day.to_le_bytes()]` (u16 LE), owner txoracle. `epoch_day = u16(ts / 86_400_000)`. Verified live: epochDay `20634` -> `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` (EXISTS). Always `getAccountInfo(pda)` and render green only if EXISTS.

## 4. The txoracle CPI (the Track-1 hero)
- Program: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` (devnet submitted escrow target). Mainnet TxLINE target is `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`, but using it for fund settlement requires a separate ProofMarket mainnet deployment compiled against that target.
- Instruction: `validate_stat`, discriminator `[107,197,232,90,191,136,105,185]`.
- Single read-only account: `daily_scores_merkle_roots` (the PDA above).
- Args: `ts:i64, fixtureSummary:ScoresBatchSummary, fixtureProof:ProofNode[], mainTreeProof:ProofNode[], predicate:TraderPredicate, statA:StatTerm, statB:Option<StatTerm>, op:Option<BinaryExpression>`.
- Returns a bool via `get_return_data()`: `AQ==`(0x01)=true, `AA==`(0x00)=false. Both outcomes succeed (~205k CU).
- ProofMarket's `resolve` invokes this as a **RAW `solana_program::program::invoke`** (Anchor 0.31.1's `declare_program!` is unusable on the txoracle IDL), prepends `setComputeUnitLimit(1_400_000)`, and rebuilds `predicate`/`statA` from `Market` storage (never trusting the caller-supplied predicate).
