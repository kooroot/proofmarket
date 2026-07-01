/** One sub-predicate. v1: single-stat GreaterThan ⇒ statKeyB=0, opCode=0, comparisonCode=0. */
export interface Predicate {
  statKeyA: number;       // u32
  statKeyB: number;       // u32, 0 if single-stat
  opCode: number;         // u8: 0=none, 1=Add, 2=Subtract
  comparisonCode: number; // u8: 0=GT, 1=LT, 2=EQ
  threshold: number;      // i32
}

/** Fields that enter the market_id preimage (§3.4). */
export interface MarketDefinitionBase {
  fixtureId: number;        // i64 (all observed ids < 2^53)
  marketScopePeriod: number; // u16 SEMANTIC scope: 0=full-game (NOT the leaf ScoreStat.period)
  combinatorCode: number;    // u8: 0=single, 1=AND, 2=OR (v1 uses 0)
  predicates: Predicate[];
}

/** A fully-materialized off-chain market definition. */
export interface MarketDefinition extends MarketDefinitionBase {
  templateId: string;
  title: string;       // canonical title (== renderTitle(base)); titleHash folded into market_id
  marketId: bigint;    // u64
  marketPda: string;   // base58
  vaultPda: string;    // base58
  lockTs: number;      // = fixture StartTime (ms) — Market lock boundary
  resolveAfterTs: number; // = resolveAfterTsMs(StartTime); on-chain resolve_after_ts_ms (spec §2.8)
}

/** v1 template: single-stat GreaterThan over a monotone key. */
export interface MarketTemplate {
  id: string;
  statKeyA: number;
  threshold: number;
}

/** §3.3 source-of-truth fixture fields (matches /api/fixtures/snapshot item). */
export interface Fixture {
  FixtureId: number;
  StartTime: number;
  Competition?: string;
  CompetitionId: number;
  FixtureGroupId?: number;
  Participant1Id: number;
  Participant1?: string;
  Participant2Id: number;
  Participant2?: string;
  Participant1IsHome: boolean; // feed designation ONLY — never used for settlement (§3.3)
}
