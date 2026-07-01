export interface ProofNode { hash: number[]; isRightSibling: boolean; }
export interface ProofJson {
  ts: number; statToProve: { key: number; value: number; period: number };
  eventStatRoot: number[];
  summary: { fixtureId: number; updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number }; eventStatsSubTreeRoot: number[] };
  statProof: ProofNode[]; subTreeProof: ProofNode[]; mainTreeProof: ProofNode[];
}
export interface AnchorBundle {
  statToProve: { key: number; value: number; period: number };
  statProof: ProofNode[]; fixtureProof: ProofNode[]; mainTreeProof: ProofNode[]; // subTreeProof → fixture_proof arg
  eventStatRoot: number[]; eventsSubTreeRoot: number[];                          // eventStatsSubTreeRoot → eventsSubTreeRoot
  fixtureId: number; updateCount: number; minTimestamp: number; maxTimestamp: number; ts: number;
}
export function adaptProofBundle(j: ProofJson): AnchorBundle {
  return { statToProve: j.statToProve, statProof: j.statProof, fixtureProof: j.subTreeProof, mainTreeProof: j.mainTreeProof,
    eventStatRoot: j.eventStatRoot, eventsSubTreeRoot: j.summary.eventStatsSubTreeRoot,
    fixtureId: j.summary.fixtureId, updateCount: j.summary.updateStats.updateCount,
    minTimestamp: j.summary.updateStats.minTimestamp, maxTimestamp: j.summary.updateStats.maxTimestamp, ts: j.ts };
}
