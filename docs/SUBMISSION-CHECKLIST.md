# ProofMarket Submission Checklist

ProofMarket is a World Cup football prediction market powered by TxLINE data. It is a devnet settlement demo: no real funds, no official tournament affiliation, and no human vote or dispute window.

## Settlement Proof Path

- Proof endpoint: `/api/scores/stat-validation`
- Web proxy: `/api/txline/proof/[fixtureId]?seq=&statKey=[&statKey2=]`
- Root account: `daily_scores_roots` PDA, seeded by `["daily_scores_roots", epochDay u16 LE]`
- Oracle call: ProofMarket `resolve` CPIs into TxLINE `validate_stat`
- Proof bundle fields: `fixtureSummary`, `eventStatRoot`, `statProof`, `subTreeProof`, `mainTreeProof`
- Receipt chain: stat leaf -> eventStatRoot -> fixture subtree -> daily root PDA -> `validate_stat TRUE` -> escrow release

## Market Shapes

| Market | Predicate | Validation |
| --- | --- | --- |
| Match Winner | participant1 goals - participant2 goals > 0 | two-stat |
| Over / Under Goals | participant1 goals + participant2 goals > 2 | two-stat Add; integer equivalent of over 2.5 goals |
| Team Goals | participant1 total goals > 1 | single-stat |
| Corners Micro Market | participant1 corners - participant2 corners > 0 | two-stat |

Cards markets are not listed as supported until TxLINE card stat keys are verified in the feed and added to the on-chain allowlist.

## Hero Screen Fields

- Market question
- YES pool / NO pool
- Resolve predicate
- TxLINE fixtureId
- statKey / statKey2
- resolveAfter timestamp
- Proof status

## Safe Wording

Use:

- World Cup football prediction market
- World Cup match data settlement demo
- football prediction market powered by TxLINE data

Avoid any wording that implies tournament organizer endorsement, organizer-operated settlement, or official-market status.
