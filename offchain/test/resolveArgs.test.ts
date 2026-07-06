import { test, expect } from "bun:test";
import { BN } from "@coral-xyz/anchor";
import { buildResolveArgs } from "../src/keeper/resolveArgs.ts";
import type { ProofBundle } from "../src/keeper/types.ts";

const BUNDLE: ProofBundle = {
  ts: 1782788706633,
  statToProve: { key: 1, value: 1, period: 7 },
  eventStatRoot: [112, 180, 31, 30, 3, 89],
  summary: {
    fixtureId: 18172280,
    updateStats: { updateCount: 50, minTimestamp: 1782788706633, maxTimestamp: 1782788999466 },
    eventStatsSubTreeRoot: [249, 76, 119, 244],
  },
  statProof: [{ hash: [240, 226], isRightSibling: true }],
  subTreeProof: [{ hash: [112, 180], isRightSibling: false }],
  mainTreeProof: [{ hash: [34, 174], isRightSibling: false }],
};

test("ts is a BN equal to the bundle top-level ts (same var as the PDA seed)", () => {
  expect(buildResolveArgs(BUNDLE).ts.eq(new BN(1782788706633))).toBe(true);
});

test("statA echoes the leaf {key,value,period} VERBATIM (period 7 is part of the preimage)", () => {
  expect(buildResolveArgs(BUNDLE).statA.statToProve).toEqual({ key: 1, value: 1, period: 7 });
});

test("RENAME: summary.eventStatsSubTreeRoot -> fixtureSummary.eventsSubTreeRoot", () => {
  expect(buildResolveArgs(BUNDLE).fixtureSummary.eventsSubTreeRoot).toEqual([249, 76, 119, 244]);
});

test("updateCount is echoed as i32 (no BN); proofs map to {hash,isRightSibling}", () => {
  const a = buildResolveArgs(BUNDLE);
  expect(a.fixtureSummary.updateStats.updateCount).toBe(50);
  expect(a.fixtureProof).toEqual([{ hash: [112, 180], isRightSibling: false }]);
  expect(a.mainTreeProof[0].isRightSibling).toBe(false);
});

test("v1 single-stat: statB is null and NO predicate/op fields exist (rebuilt on-chain)", () => {
  const a: any = buildResolveArgs(BUNDLE);
  expect(a.statB).toBeNull();
  expect("predicate" in a).toBe(false);
  expect("op" in a).toBe(false);
});

test("two-stat bundles map statToProve2 into resolve statB", () => {
  const a = buildResolveArgs({
    ...BUNDLE,
    statToProve2: { key: 2, value: 0, period: 7 },
    eventStatRoot2: [11, 12, 13],
    statProof2: [{ hash: [44, 45], isRightSibling: true }],
  });

  expect(a.statB).toEqual({
    statToProve: { key: 2, value: 0, period: 7 },
    eventStatRoot: [11, 12, 13],
    statProof: [{ hash: [44, 45], isRightSibling: true }],
  });
});
