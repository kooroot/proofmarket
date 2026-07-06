# ProofMarket Future Development Direction

This note is intentionally fact-based. It separates what the current hackathon
submission already implements from what should become the next architecture.

## Current submission boundary

ProofMarket v1 is a devnet, play-money settlement demo for objective football
markets. The current on-chain program does not mint YES/NO share tokens. It
holds a USDC parimutuel pool with these primitives:

- `Market.yes_pool` and `Market.no_pool` track stake on each side.
- `Position.yes_amount` and `Position.no_amount` track each user's exposure.
- `stake` transfers test-USDC into the market vault.
- `resolve` CPIs into TxLINE `validate_stat` and reads the returned boolean.
- `claim` pays winning positions pro rata from the vault.

That is enough for the hackathon thesis:

> Objective match data can gate settlement directly through TxLINE proof
> validation, without a vote, dispute window, or human oracle committee.

It is not yet a Polymarket-style conditional token market, a CLOB, an AMM, a
regulated venue, or a production money market.

## Why the next version should move to outcome shares

The current pooled staking model is simple and good for proving the settlement
path. The next version should separate "settlement correctness" from "market
microstructure" by introducing collateral-backed outcome shares.

Target model:

1. A market condition is created from a TxLINE fixture and predicate.
2. A user deposits 1 USDC.
3. The protocol mints a complete set: 1 YES share and 1 NO share.
4. Before settlement, a user can merge a complete set back into 1 USDC.
5. YES and NO shares can trade independently.
6. TxLINE `validate_stat` resolves the predicate.
7. Winning shares redeem for collateral; losing shares redeem for zero.

This is closer to the structure used by major prediction-market designs:
collateral creates complete outcome sets, prices emerge from trading the
outcome claims, and final settlement turns one outcome into the redeemable
claim.

## Solana Token-2022 direction

Token-2022 is the right Solana-native direction to investigate for outcome
shares, but it should not be described as "ERC-1155 on Solana." The safer
Solana framing is:

- one Token-2022 mint per outcome, such as `MARKET-123:YES` and
  `MARKET-123:NO`;
- a shared market or condition account that defines the collateral, predicate,
  fixture, settlement network, and resolution state;
- Token-2022 group/member extensions to associate the outcome mints with one
  market;
- Token-2022 metadata extensions to make the outcome tokens self-describing;
- optional transfer hooks or pause controls for market-state restrictions;
- program-controlled mint, burn, split, merge, and redeem instructions.

Useful Token-2022 extensions to evaluate:

- `MetadataPointer` / `TokenMetadata` for fixture id, predicate, outcome index,
  data network, and settlement program metadata.
- `GroupPointer` / `TokenGroup` and `GroupMemberPointer` / `TokenGroupMember`
  for grouping multiple outcome mints under one market.
- `TransferHook` if the protocol needs to block transfers after resolution or
  enforce market-specific transfer rules.
- `Pausable` or equivalent market-state gating if the design needs emergency
  controls.
- `PermanentDelegate` only if the redemption/burn authority is carefully
  specified and audited.

Key implementation rule: Token-2022 extensions usually need to be planned at
mint creation time. The share-token design should therefore be specified before
any production mint is deployed.

## Proposed v2 architecture

### Phase 1 - Keep v1 as the proof-settlement core

Keep the current parimutuel demo as the hackathon proof:

- TxLINE fixture and stat proof enter the settlement path.
- ProofMarket verifies the predicate through `validate_stat`.
- The escrow releases only after the predicate is proven.
- The UI explains the proof receipt from stat leaf to daily-root PDA.

This remains the clearest demonstration of the TxLINE value proposition.

### Phase 2 - Specify conditional outcome shares

Add a protocol specification before code:

- `Condition` or `MarketCondition` account.
- collateral mint and vault.
- outcome count and outcome labels.
- TxLINE fixture id, stat keys, predicate operator, threshold, and resolve time.
- Token-2022 outcome mint addresses.
- split, merge, redeem, and settle invariants.
- settlement behavior for TRUE, FALSE, void, cancelled, or stale-proof cases.

The spec should explicitly state that current v1 pools are not share tokens.

### Phase 3 - Implement split and merge

Add program instructions:

- `split_collateral`: deposit collateral and mint a complete YES/NO set.
- `merge_complete_set`: burn one complete set and return collateral before
  resolution.
- `settle_condition`: call TxLINE `validate_stat` and store the resolved
  outcome.
- `redeem_winning_shares`: burn winning shares and release collateral.

Invariants:

- Total redeemable value cannot exceed collateral in the vault.
- A complete YES/NO set always maps to exactly one unit of collateral before
  settlement.
- After settlement, only the winning outcome is redeemable.
- Losing shares cannot claim collateral.

### Phase 4 - Add trading on top of shares

Once outcome shares exist, trading can be added without changing the settlement
oracle:

- CLOB orderbook for YES and NO shares.
- AMM pool for simpler liquidity bootstrapping.
- Hybrid model: initial seeded liquidity, then orderbook trading.
- Market maker inventory management.
- UI prices expressed as probabilities.

The important separation is that TxLINE remains the settlement truth source;
the orderbook or AMM only determines pre-settlement trading prices.

### Phase 5 - Production hardening

Before any real-money version, the protocol would need:

- independent security audit;
- formalized collateral accounting;
- authority and upgrade policy;
- rate limits and keeper failure handling;
- regulatory review;
- production oracle/network configuration;
- token metadata review;
- wallet and explorer compatibility tests for Token-2022 shares;
- monitoring for settlement, redemption, and vault solvency.

## TxLINE role in the future design

TxLINE should stay as the core settlement differentiator:

- The market predicate is objective and stat-based.
- The daily root PDA anchors the published match data.
- `validate_stat` recomputes the proof path and returns the predicate result.
- ProofMarket uses that boolean to settle the market condition.

Do not overstate the integration:

- TxLINE proves the stat predicate.
- ProofMarket controls its own escrow, shares, and payout logic.
- TxLINE does not itself move ProofMarket user funds.

## Kalshi and broader market context

Prediction markets are moving toward more distribution channels, better data
surfaces, and more sophisticated market structure. That supports the broader
case for ProofMarket, but the repo should not claim unverified integrations.

Safe phrasing:

- "Regulated prediction-market data and on-chain distribution are becoming a
  visible market theme."
- "If regulated event markets expose more on-chain data or settlement rails,
  ProofMarket's proof-gated settlement model becomes more relevant."
- "Kalshi-on-Solana settlement is a watch item, not a confirmed dependency."

Avoid:

- "Kalshi is launching settlement on Solana" unless there is an official source.
- "ProofMarket already implements Polymarket-style shares."
- "Token-2022 is the same as ERC-1155."
- "TxLINE settles user funds."

## Hackathon pitch wording

Recommended:

> ProofMarket v1 proves the hardest part first: objective, on-chain settlement
> from TxLINE match-data proofs. The next step is to replace the demo's
> parimutuel pool with Token-2022 outcome shares, so each market can support
> split/merge collateral mechanics, secondary trading, and final redemption
> through the same `validate_stat` proof gate.

Short version:

> v1 is proof-gated parimutuel settlement. v2 becomes proof-gated conditional
> outcome shares on Solana.

## Sources checked

- Solana Token Extensions documentation:
  https://solana.com/docs/tokens/extensions
- Solana Program Token-2022 documentation:
  https://www.solana-program.com/docs/token-2022
- RareSkills Token-2022 explainer, useful as a secondary technical summary:
  https://rareskills.io/post/token-2022
- TxLINE World Cup Free Tier documentation:
  https://txline.txodds.com/documentation/worldcup
