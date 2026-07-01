import { describe, it, expect } from "vitest";
import { adaptProofBundle, type ProofJson } from "./proof";
const json: ProofJson = {
  ts: 1782788706633,
  statToProve: { key: 1, value: 1, period: 7 },
  eventStatRoot: [112, 180, 31, 30],
  summary: {
    fixtureId: 18172280,
    updateStats: { updateCount: 50, minTimestamp: 1782788706633, maxTimestamp: 1782788706700 },
    eventStatsSubTreeRoot: [249, 76, 119, 244],
  },
  statProof: [{ hash: [1], isRightSibling: true }],
  subTreeProof: [{ hash: [2], isRightSibling: false }],
  mainTreeProof: [{ hash: [3], isRightSibling: true }],
};
describe("adaptProofBundle (§4.6 JSON→Anchor renames)", () => {
  it("renames subTreeProof → fixtureProof", () => { expect(adaptProofBundle(json).fixtureProof).toEqual(json.subTreeProof); });
  it("renames eventStatsSubTreeRoot → eventsSubTreeRoot", () => { expect(adaptProofBundle(json).eventsSubTreeRoot).toEqual(json.summary.eventStatsSubTreeRoot); });
  it("keeps statProof and mainTreeProof identity + updateCount i32", () => {
    const a = adaptProofBundle(json); expect(a.statProof).toEqual(json.statProof); expect(a.updateCount).toBe(50);
  });
});
