import { test, expect } from "bun:test";
import { buildReceipt } from "../src/keeper/receipt.ts";
import type { ProofBundle } from "../src/keeper/types.ts";

const bundle: ProofBundle = {
  ts: 1782788706633,
  statToProve: { key: 1, value: 1, period: 7 },
  eventStatRoot: [112, 180],
  summary: { fixtureId: 18172280, updateStats: { updateCount: 50, minTimestamp: 1782788706633, maxTimestamp: 1782788999466 }, eventStatsSubTreeRoot: [249, 76] },
  statProof: [{ hash: [240], isRightSibling: true }],
  subTreeProof: [{ hash: [112], isRightSibling: false }],
  mainTreeProof: [{ hash: [34], isRightSibling: false }],
};

test("builds a single-stat YES receipt with the return-byte as the resolution signal", () => {
  const r = buildReceipt({
    marketId: "777", fixtureId: 18172280, combinator: "single",
    subBundles: [{ bundle, dailyRootPda: "Bc…", dailyRootOnChain: [9], validateStatReturn: "AQ==" }],
    outcome: "YES", resolveTxSig: "SIG", finalWhistleTs: 1782788700000, ts: 1782788706633,
  });
  expect(r.combinator).toBe("single");
  expect(r.proofsVerified).toBe(1);
  expect(r.humanVotes).toBe(0);
  expect(r.disputeWindowSeconds).toBe(0);
  expect(r.subResolutions[0].validateStatReturn).toBe("AQ==");
  expect(r.subResolutions[0].leaf).toEqual({ key: 1, value: 1, period: 7 });
  expect(r.secondsFromFinalWhistle).toBe(Math.round((1782788706633 - 1782788700000) / 1000));
});
