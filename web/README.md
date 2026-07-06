# ProofMarket — trustless parimutuel prediction markets on Solana devnet

**No vote. No dispute window. Just math.**

ProofMarket is a parimutuel prediction market for FIFA World Cup fixtures that settles
**trustlessly** with a single on-chain CPI into TxLINE's `validate_stat` oracle. There is no human
resolver, no committee vote, and no challenge/dispute window — the escrow releases funds only when a
cryptographic proof over a TxODDS-signed match statistic evaluates to `true`.

> **Settlement demo: devnet only.** Every fund-moving artifact below is on Solana **devnet** and uses
> **test USDC** (a faucet mint). No real funds are ever at risk. TxLINE data fetching is now
> network-configurable, so `/api/txline/*` can be pointed at mainnet World Cup data separately.

## The resolution chain (what a judge can verify)

A market resolves by folding a single signed stat leaf up a Merkle chain to an on-chain daily root,
then gating the escrow on the oracle's boolean:

1. **Stat leaf** — `{key, value}` for a fixture (e.g. P1 goals = 1).
2. **leaf → eventStatRoot** — folds via `statProof`.
3. **eventStatRoot → fixture sub-tree** — folds via `fixtureProof`.
4. **fixture sub-tree → daily root (on-chain PDA)** — folds via `mainTreeProof`; the daily root is a
   real account owned by the TxLINE oracle program.
5. **escrow → CPI → `validate_stat` → bool** — the ProofMarket escrow makes an inner CPI to the
   oracle; the returned boolean gates the release.
6. **escrow release** — each winner pulls `stake_i · payout_pool / winning_pool` from the vault PDA.

The `ProofChain` "Proof Receipt" (Screen 4) visualizes exactly this chain, with Solana Explorer
links to every on-chain artifact.

## On-chain artifacts (devnet)

| Artifact | Address |
| --- | --- |
| ProofMarket program | `6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb` |
| TxLINE oracle (`validate_stat` CPI target) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| Test-USDC mint | `2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT` |
| Daily-root PDA (`epoch_day` 20634) | `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` |
| Cluster | `https://api.devnet.solana.com` |

Daily-root PDA derivation: `["daily_scores_roots", 20634u16 (LE)]` under the TxLINE oracle program.

## TxLINE Network Modes

ProofMarket separates the data network from the settlement network:

| Purpose | Env | Default | Notes |
| --- | --- | --- | --- |
| TxLINE data proxy | `TXLINE_NETWORK` | `devnet` | Set to `mainnet` to fetch from `https://txline.txodds.com/api`. |
| ProofMarket settlement oracle | `NEXT_PUBLIC_SETTLEMENT_TXLINE_NETWORK` | `devnet` | Keep devnet unless ProofMarket is redeployed against the mainnet TxLINE program. |

Official World Cup mainnet config used by the code:

| Network | API | TxLINE program | Free World Cup tiers |
| --- | --- | --- | --- |
| devnet | `https://txline-dev.txodds.com/api` | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | SL1, 60-second delay |
| mainnet | `https://txline.txodds.com/api` | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` | SL1, 60-second delay; SL12, real-time |

Mainnet event/proof fetching is testable now. Mainnet escrow settlement is a separate redeploy:
ProofMarket's current Anchor program is compiled and deployed against the devnet TxLINE oracle.

## Judge / API endpoints

The frontend proxies the selected TxLINE API server-side (auth headers never reach the browser; every id
is validated as a non-negative integer before it touches the upstream path):

| Route | Purpose |
| --- | --- |
| `GET /api/txline/proof/[fixtureId]?seq&statKey[&statKey2]` | Stat-validation bundle (the proof) — proxies TxLINE `/api/scores/stat-validation` |
| `GET /api/txline/scores/snapshot/[fixtureId]` | Scores snapshot |
| `GET /api/txline/odds/snapshot/[fixtureId]` | Odds snapshot |
| `POST /api/faucet/usdc` | Mint test USDC to a wallet (devnet faucet) |

## Headline demo

- **Replay (no wallet required):** `/replay/18172280` — scrubs the recorded score timeline (P1 goals
  0 → 1) to full-time, then reveals the Proof Receipt with live Explorer links to the already-settled
  devnet artifacts.
- **Live receipt:** `/m/<marketPda>/receipt`.

## Run locally

```bash
cd web
npm install
npm run dev      # http://localhost:3000  (open /replay/18172280)
```

The client config (`RPC_URL`, program id, USDC mint) ships with committed devnet defaults in
`next.config.mjs`, so `npm run dev` and `npm run build` work with no `.env` file.

**Server-side secrets** (needed only for the TxLINE proxy + faucet to return live data):

| Var | Used by |
| --- | --- |
| `TXLINE_NETWORK` | `/api/txline/*` proxy host selector (`devnet` or `mainnet`) |
| `TXLINE_JWT` | `/api/txline/*` proxy |
| `TXLINE_API_TOKEN` | `/api/txline/*` proxy |
| `FAUCET_AUTHORITY_SECRET` | `/api/faucet/usdc` |

## Deploy (Vercel)

> These steps require interactive auth + dashboard access and are performed by the operator.

```bash
cd web
npx vercel link                       # one-time: link or create the Vercel project
# set TXLINE_JWT, TXLINE_API_TOKEN, FAUCET_AUTHORITY_SECRET (and any NEXT_PUBLIC_* overrides)
# in the Vercel dashboard or via `vercel env add`
npx vercel deploy --prod --yes        # deploy from web/ (the Next.js project root)
```

Then open `/replay/18172280` on the live URL and confirm every Explorer link resolves and the
daily-root link is green (EXISTS).
