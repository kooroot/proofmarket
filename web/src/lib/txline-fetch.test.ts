import { describe, it, expect } from "vitest";
import { buildHeaders } from "./txline-fetch";
describe("txline headers", () => {
  it("sends BOTH bearer jwt and X-Api-Token", () => {
    const h = buildHeaders("JWT123", "TOK456");
    expect(h.Authorization).toBe("Bearer JWT123");
    expect(h["X-Api-Token"]).toBe("TOK456");
    expect(h["Accept-Encoding"]).toBe("gzip");
  });
});
