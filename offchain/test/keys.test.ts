import { test, expect } from "bun:test";
import { MONOTONE_CUMULATIVE_KEYS, isMonotoneKey, statKeyLabel } from "../src/catalog/keys.ts";

test("allowlist mirrors the Phase-1 Rust constant exactly (goals 1/2 + corners 7/8; cards excluded in v1)", () => {
  // MUST equal constants.rs:34  pub const MONOTONE_CUMULATIVE_KEYS: [u32;4] = [1,2,7,8];
  expect([...MONOTONE_CUMULATIVE_KEYS]).toEqual([1, 2, 7, 8]);
});

test("isMonotoneKey: allowlisted keys true, everything else (incl. cards) false", () => {
  expect(isMonotoneKey(1)).toBe(true);
  expect(isMonotoneKey(2)).toBe(true);
  expect(isMonotoneKey(7)).toBe(true);
  expect(isMonotoneKey(8)).toBe(true);
  expect(isMonotoneKey(3)).toBe(false);    // card key — EXCLUDED in v1 (not in Rust allowlist); locks the invariant
  expect(isMonotoneKey(1001)).toBe(false); // period-keyed — deferred TIER-2
  expect(isMonotoneKey(0)).toBe(false);
});

test("labels are deterministic per participant/stat", () => {
  expect(statKeyLabel(1)).toBe("P1 Goals");
  expect(statKeyLabel(8)).toBe("P2 Corners");
});

test("unknown / excluded key throws (no silent mislabel)", () => {
  expect(() => statKeyLabel(99)).toThrow();
  expect(() => statKeyLabel(3)).toThrow(); // card key not labeled — 3/4=yellow,5/6=red mapping UNCONFIRMED, don't guess
});
