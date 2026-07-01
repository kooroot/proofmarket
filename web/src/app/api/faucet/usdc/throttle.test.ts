import { describe, it, expect } from "vitest";
import { allow, allowSolGrant, isValidPubkey, SOL_BUDGET_LAMPORTS, WINDOW_MS, type SolBudget } from "./throttle";
describe("faucet throttle", () => {
  it("allows once then blocks within window", () => {
    const seen = new Map<string, number>(); const now = 1000;
    expect(allow("PK", seen, now)).toBe(true);
    expect(allow("PK", seen, now + 1000)).toBe(false);     // < 1h window
    expect(allow("PK", seen, now + 3_700_000)).toBe(true); // > 1h later
  });
  it("prunes expired entries so the map cannot grow unbounded", () => {
    const seen = new Map<string, number>();
    allow("A", seen, 1000); allow("B", seen, 1000);
    expect(seen.size).toBe(2);
    allow("C", seen, 1000 + WINDOW_MS);                    // A,B expired -> pruned; C added
    expect(seen.size).toBe(1);
    expect(seen.has("C")).toBe(true);
  });
});
describe("faucet SOL budget", () => {
  it("grants up to the global budget then denies within a window", () => {
    const b: SolBudget = { windowStart: 0, spent: 0 };
    const half = SOL_BUDGET_LAMPORTS / 2;
    expect(allowSolGrant(b, 1000, half)).toBe(true);
    expect(allowSolGrant(b, 1000, half)).toBe(true);       // now at full budget
    expect(allowSolGrant(b, 1000, half)).toBe(false);      // exceeds -> deny
  });
  it("resets the budget after the window elapses", () => {
    const b: SolBudget = { windowStart: 0, spent: 0 };
    expect(allowSolGrant(b, 1000, SOL_BUDGET_LAMPORTS)).toBe(true);
    expect(allowSolGrant(b, 1000, 1)).toBe(false);         // exhausted this window
    expect(allowSolGrant(b, 1000 + WINDOW_MS, 1)).toBe(true); // new window
  });
});
describe("faucet pubkey validation", () => {
  it("accepts a valid base58 pubkey and rejects garbage", () => {
    expect(isValidPubkey("11111111111111111111111111111111")).toBe(true);
    expect(isValidPubkey("not-a-key")).toBe(false);
    expect(isValidPubkey("")).toBe(false);
    expect(isValidPubkey(null)).toBe(false);
    expect(isValidPubkey(123)).toBe(false);
  });
});
