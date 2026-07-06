export interface ProofNode { hash: number[]; isRightSibling: boolean; }
export interface ProofJson {
  ts: number; statToProve: { key: number; value: number; period: number };
  eventStatRoot: number[];
  statToProve2?: { key: number; value: number; period: number };
  eventStatRoot2?: number[];
  summary: { fixtureId: number; updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number }; eventStatsSubTreeRoot: number[] };
  statProof: ProofNode[]; statProof2?: ProofNode[]; subTreeProof: ProofNode[]; mainTreeProof: ProofNode[];
}
export interface AnchorBundle {
  statToProve: { key: number; value: number; period: number };
  statToProve2?: { key: number; value: number; period: number };
  statProof: ProofNode[]; statProof2?: ProofNode[]; fixtureProof: ProofNode[]; mainTreeProof: ProofNode[]; // subTreeProof → fixture_proof arg
  eventStatRoot: number[]; eventStatRoot2?: number[]; eventsSubTreeRoot: number[];                          // eventStatsSubTreeRoot → eventsSubTreeRoot
  fixtureId: number; updateCount: number; minTimestamp: number; maxTimestamp: number; ts: number;
}
export function adaptProofBundle(j: ProofJson): AnchorBundle {
  return { statToProve: j.statToProve, statToProve2: j.statToProve2, statProof: j.statProof, statProof2: j.statProof2,
    fixtureProof: j.subTreeProof, mainTreeProof: j.mainTreeProof,
    eventStatRoot: j.eventStatRoot, eventStatRoot2: j.eventStatRoot2, eventsSubTreeRoot: j.summary.eventStatsSubTreeRoot,
    fixtureId: j.summary.fixtureId, updateCount: j.summary.updateStats.updateCount,
    minTimestamp: j.summary.updateStats.minTimestamp, maxTimestamp: j.summary.updateStats.maxTimestamp, ts: j.ts };
}
