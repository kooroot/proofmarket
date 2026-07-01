import { describe, it, expect } from "vitest";
import { buildHeaders, isNumericId } from "./txline-fetch";
describe("txline headers", () => {
  it("sends BOTH bearer jwt and X-Api-Token", () => {
    const h = buildHeaders("JWT123", "TOK456");
    expect(h.Authorization).toBe("Bearer JWT123");
    expect(h["X-Api-Token"]).toBe("TOK456");
    expect(h["Accept-Encoding"]).toBe("gzip");
  });
});
describe("isNumericId", () => {
  it("accepts plain integer strings", () => {
    expect(isNumericId("18172280")).toBe(true);
    expect(isNumericId("0")).toBe(true);
  });
  it("rejects null, empty, and injection payloads", () => {
    expect(isNumericId(null)).toBe(false);
    expect(isNumericId("")).toBe(false);
    expect(isNumericId("18172280&statKey=1")).toBe(false);
    expect(isNumericId("../scores/historical")).toBe(false);
    expect(isNumericId("12 34")).toBe(false);
    expect(isNumericId("1e3")).toBe(false);
    expect(isNumericId("-5")).toBe(false);
  });
});
