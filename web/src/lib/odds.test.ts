import { describe, it, expect } from "vitest";
import { fairProbFromOdds } from "./odds";
describe("fairProbFromOdds (§6b candidate, indicative)", () => {
  it("decodes offer decimal×1000 to a probability", () => {
    expect(fairProbFromOdds(1818)!).toBeCloseTo(0.55, 2); // 1000/1818 ≈ 0.55 (de-margined ≈ true prob)
  });
  it("guards bad inputs", () => { expect(fairProbFromOdds(0)).toBeNull(); expect(fairProbFromOdds(-5)).toBeNull(); });
});
