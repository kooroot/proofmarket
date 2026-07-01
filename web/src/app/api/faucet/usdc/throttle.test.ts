import { describe, it, expect } from "vitest";
import { allow } from "./throttle";
describe("faucet throttle", () => {
  it("allows once then blocks within window", () => {
    const seen = new Map<string, number>(); const now = 1000;
    expect(allow("PK", seen, now)).toBe(true);
    expect(allow("PK", seen, now + 1000)).toBe(false);     // < 1h window
    expect(allow("PK", seen, now + 3_700_000)).toBe(true); // > 1h later
  });
});
