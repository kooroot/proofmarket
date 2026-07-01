import { describe, it, expect } from "vitest";
import { claimable } from "./tx-claim";
import { STATE } from "./market";
describe("claimable", () => {
  it("blocks until Resolved", () => { expect(claimable({ state: STATE.Open }, { claimed: false })).toBe(false); });
  it("blocks if already claimed", () => { expect(claimable({ state: STATE.Resolved }, { claimed: true })).toBe(false); });
  it("allows a resolved, unclaimed position (losers too, payout 0)", () => { expect(claimable({ state: STATE.Resolved }, { claimed: false })).toBe(true); });
});
