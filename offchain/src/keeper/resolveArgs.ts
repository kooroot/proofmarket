import { BN } from "@coral-xyz/anchor";
import type { ProofBundle, ProofNodeWire, ProofNodeArg, ResolveArgs } from "./types.ts";

const toNode = (n: ProofNodeWire): ProofNodeArg => ({ hash: n.hash, isRightSibling: n.isRightSibling });

/**
 * Map a cached/live stat-validation bundle into the canonical resolve() positional args.
 * Mirrors validate-sim.ts:74-100 EXCEPT it omits predicate + op — P1 rebuilds those from
 * Market storage. statB is always null in v1 (single-stat). Leaf period echoed verbatim.
 */
export function buildResolveArgs(bundle: ProofBundle): ResolveArgs {
  return {
    ts: new BN(bundle.ts),
    fixtureSummary: {
      fixtureId: new BN(bundle.summary.fixtureId),
      updateStats: {
        updateCount: bundle.summary.updateStats.updateCount, // i32 — do NOT wrap in BN
        minTimestamp: new BN(bundle.summary.updateStats.minTimestamp),
        maxTimestamp: new BN(bundle.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: bundle.summary.eventStatsSubTreeRoot, // RENAME (§3.1)
    },
    fixtureProof: bundle.subTreeProof.map(toNode),
    mainTreeProof: bundle.mainTreeProof.map(toNode),
    statA: {
      statToProve: {
        key: bundle.statToProve.key,
        value: bundle.statToProve.value,
        period: bundle.statToProve.period, // echo VERBATIM — part of the Merkle-leaf preimage
      },
      eventStatRoot: bundle.eventStatRoot,
      statProof: bundle.statProof.map(toNode),
    },
    statB: null,
  };
}
