import { describe, it, expect } from "vitest";
import { TXORACLE_PROGRAM_ID, MIN_STAKE, MAX_FEE_BPS, USDC_DECIMALS } from "./constants";
describe("constants", () => {
  it("pins txoracle program id", () => { expect(TXORACLE_PROGRAM_ID.toBase58()).toBe("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"); });
  it("pins canonical numeric constants", () => { expect(MIN_STAKE).toBe(1_000n); expect(MAX_FEE_BPS).toBe(1000); expect(USDC_DECIMALS).toBe(6); });
});
