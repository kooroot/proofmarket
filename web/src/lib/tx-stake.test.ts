import { describe, it, expect } from "vitest";
import { validateStakeAmount } from "./tx-stake";
import { MIN_STAKE } from "./constants";
describe("stake guards (CANONICAL CONTRACT)", () => {
  it("rejects 0", () => { expect(validateStakeAmount(0n)).toBe("ZeroAmount"); });
  it("rejects below MIN_STAKE", () => { expect(validateStakeAmount(MIN_STAKE - 1n)).toBe("StakeTooSmall"); });
  it("accepts >= MIN_STAKE", () => { expect(validateStakeAmount(MIN_STAKE)).toBeNull(); });
});
