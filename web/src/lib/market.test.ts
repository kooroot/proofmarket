// @vitest-environment node
import { describe, it, expect } from "vitest";
import { epochDayFromTs, dailyRootPda, marketPda, toUiMarket, isDisplayableMarket, type RawMarket } from "./market";
describe("market derivations", () => {
  it("epochDay = floor(ts_ms / 86_400_000)", () => { expect(epochDayFromTs(1782788706633)).toBe(20634); }); // verified §4.12
  it("daily-root PDA for epochDay 20634 is the EXISTS root", () => {
    expect(dailyRootPda(20634).toBase58()).toBe("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
  });
  it("marketPda is deterministic", () => { expect(marketPda(7n).toBase58()).toBe(marketPda(7n).toBase58()); });
  it("toUiMarket maps P1 fields + bigints", () => {
    const raw: RawMarket = { marketId: 7n, fixtureId: 18172280n, statAKey: 1, statAPeriod: 7, op: null, threshold: 0, comparison: 0, yesPool: 100_000_000n, noPool: 50_000_000n, feeBps: 200, resolveAfterTs: 1782788706633n, state: 2, outcome: 1 };
    const ui = toUiMarket("PDA111", raw);
    expect(ui.yesPool).toBe(100_000_000n); expect(ui.state).toBe(2); expect(ui.outcome).toBe(1); expect(ui.statAKey).toBe(1);
  });
  it("hides malformed trial markets with implausible resolve timestamps", () => {
    const valid = toUiMarket("VALID", { marketId: 5n, fixtureId: 18172280n, statAKey: 2, statAPeriod: 7, op: null, threshold: 0, comparison: 0, yesPool: 60_000_000n, noPool: 40_000_000n, feeBps: 100, resolveAfterTs: 1785921119045n, state: 0, outcome: 0 });
    const malformed = toUiMarket("BAD", { marketId: 2n, fixtureId: 18172280n, statAKey: 1, statAPeriod: 7, op: null, threshold: 513, comparison: 0, yesPool: 60_000_000n, noPool: 40_000_000n, feeBps: 0, resolveAfterTs: 144397762564196097n, state: 0, outcome: 0 });
    expect(isDisplayableMarket(valid, 1783000000000)).toBe(true);
    expect(isDisplayableMarket(malformed, 1783000000000)).toBe(false);
  });
});
