import type { BN } from "@coral-xyz/anchor";

export interface ProofNodeWire { hash: number[]; isRightSibling: boolean; }

/** GET /api/scores/stat-validation 200 shape. statToProve2 fields appear when statKey2 is requested. */
export interface ProofBundle {
  ts: number;
  statToProve: { key: number; value: number; period: number };
  eventStatRoot: number[];                 // [u8;32]
  statToProve2?: { key: number; value: number; period: number };
  eventStatRoot2?: number[];
  summary: {
    fixtureId: number;
    updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number };
    eventStatsSubTreeRoot: number[];       // API name; IDL field is events_sub_tree_root (§3.1)
  };
  statProof: ProofNodeWire[];
  statProof2?: ProofNodeWire[];
  subTreeProof: ProofNodeWire[];
  mainTreeProof: ProofNodeWire[];
}

export interface ProofNodeArg { hash: number[]; isRightSibling: boolean; }

export interface StatTermArg {
  statToProve: { key: number; value: number; period: number };
  eventStatRoot: number[];
  statProof: ProofNodeArg[];
}

/** Positional mirror of P1 resolve(ts, fixtureSummary, fixtureProof, mainTreeProof, statA, statB). */
export interface ResolveArgs {
  ts: BN;
  fixtureSummary: {
    fixtureId: BN;
    updateStats: { updateCount: number; minTimestamp: BN; maxTimestamp: BN };
    eventsSubTreeRoot: number[];           // RENAMED from API eventStatsSubTreeRoot
  };
  fixtureProof: ProofNodeArg[];
  mainTreeProof: ProofNodeArg[];
  statA: StatTermArg;
  statB: StatTermArg | null;               // null for single-stat; populated from statToProve2 for two-stat
}
