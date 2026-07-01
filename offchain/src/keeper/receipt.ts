import type { ProofBundle } from "./types.ts";

export interface SubResolution {
  leaf: { key: number; value: number; period: number };
  eventStatRoot: number[];
  eventsSubTreeRoot: number[];
  statProof: { hash: number[]; isRightSibling: boolean }[];
  subTreeProof: { hash: number[]; isRightSibling: boolean }[];
  mainTreeProof: { hash: number[]; isRightSibling: boolean }[];
  dailyRootPda: string;
  dailyRootOnChain: number[];
  validateStatReturn: "AQ==" | "AA==";   // THE resolution signal (0x01/0x00)
  stageLogs: string[];
}

export interface ResolutionReceipt {
  marketId: string;
  fixtureId: number;
  combinator: "single" | "AND" | "OR";
  subResolutions: SubResolution[];
  outcome: "YES" | "NO";
  resolveTxSig: string;
  ts: number;
  finalWhistleTs: number;
  secondsFromFinalWhistle: number;
  humanVotes: 0;
  disputeWindowSeconds: 0;
  proofsVerified: number;
}

export function buildReceipt(input: {
  marketId: string;
  fixtureId: number;
  combinator: "single" | "AND" | "OR";
  subBundles: { bundle: ProofBundle; dailyRootPda: string; dailyRootOnChain: number[]; validateStatReturn: "AQ==" | "AA==" }[];
  outcome: "YES" | "NO";
  resolveTxSig: string;
  finalWhistleTs: number;
  ts: number;
}): ResolutionReceipt {
  const subResolutions: SubResolution[] = input.subBundles.map((s) => ({
    leaf: { key: s.bundle.statToProve.key, value: s.bundle.statToProve.value, period: s.bundle.statToProve.period },
    eventStatRoot: s.bundle.eventStatRoot,
    eventsSubTreeRoot: s.bundle.summary.eventStatsSubTreeRoot,
    statProof: s.bundle.statProof,
    subTreeProof: s.bundle.subTreeProof,
    mainTreeProof: s.bundle.mainTreeProof,
    dailyRootPda: s.dailyRootPda,
    dailyRootOnChain: s.dailyRootOnChain,
    validateStatReturn: s.validateStatReturn,
    stageLogs: [
      "Stage 1 Validation (Stat -> Event)",
      "Stage 2 Validation (Event -> Fixture)",
      `Predicate evaluated to: ${s.validateStatReturn === "AQ==" ? "true" : "false"}`,
    ],
  }));
  return {
    marketId: input.marketId,
    fixtureId: input.fixtureId,
    combinator: input.combinator,
    subResolutions,
    outcome: input.outcome,
    resolveTxSig: input.resolveTxSig,
    ts: input.ts,
    finalWhistleTs: input.finalWhistleTs,
    secondsFromFinalWhistle: Math.round((input.ts - input.finalWhistleTs) / 1000),
    humanVotes: 0,
    disputeWindowSeconds: 0,
    proofsVerified: subResolutions.length,
  };
}
