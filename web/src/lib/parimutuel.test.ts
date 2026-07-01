import { describe, it, expect } from "vitest";
import { impliedProbYes, multiplierIfWin, payoutForStake, formatUsdc } from "./parimutuel";
const Y = 100_000_000n, N = 50_000_000n, FEE = 200; // 100/50 USDC, 2%
describe("parimutuel (loser-only fee, CANONICAL CONTRACT)", () => {
  it("implied P(YES) = Y/(Y+N)", () => { expect(impliedProbYes(Y, N)!).toBeCloseTo(0.6667, 4); expect(impliedProbYes(0n, 0n)).toBeNull(); });
  it("YES multiplier = payout_pool/winning_pool", () => {
    // losing=50M, fee=floor(50M*200/10000)=1M, payout_pool=100M+(50M-1M)=149M ⇒ 1.49x
    expect(multiplierIfWin(true, Y, N, FEE)!).toBeCloseTo(1.49, 5);
  });
  it("per-winner payout = floor(stake * payout_pool / winning_pool)", () => {
    expect(payoutForStake(10_000_000n, true, Y, N, FEE)).toBe(14_900_000n); // floor(10M*149M/100M)
  });
  it("one-sided pool ⇒ Void (null multiplier)", () => { expect(multiplierIfWin(true, Y, 0n, FEE)).toBeNull(); });
  it("formatUsdc renders 6-dp base units", () => {
    expect(formatUsdc(14_900_000n)).toBe("14.90");
    expect(formatUsdc(1_000n)).toBe("0.00");
    expect(formatUsdc(1_000n, 6)).toBe("0.001000");
  });
});
