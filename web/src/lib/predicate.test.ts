import { describe, it, expect } from "vitest";
import { predicateToText } from "./predicate";
describe("predicateToText (no period decode, §4.4)", () => {
  it("prefers the authored label", () => {
    expect(predicateToText({ label: "Total corners (full match) > 10", statAKey: 7, op: 0, comparison: 0, threshold: 10 })).toBe("Total corners (full match) > 10");
  });
  it("falls back to constructed text when label is empty", () => {
    expect(predicateToText({ label: "", statAKey: 1, op: null, comparison: 0, threshold: 0 })).toBe("P1 goals > 0");
  });
  it("maps op Add over corners keys to 'total corners'", () => {
    expect(predicateToText({ label: "", statAKey: 7, op: 0, comparison: 0, threshold: 10 })).toBe("total corners > 10");
  });
});
