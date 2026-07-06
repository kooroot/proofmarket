import { afterEach, describe, it, expect, vi } from "vitest";
import { buildHeaders, isNumericId, txlineFetch } from "./txline-fetch";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("txline headers", () => {
  it("sends BOTH bearer jwt and X-Api-Token", () => {
    const h = buildHeaders("JWT123", "TOK456");
    expect(h.Authorization).toBe("Bearer JWT123");
    expect(h["X-Api-Token"]).toBe("TOK456");
    expect(h["Accept-Encoding"]).toBe("gzip");
  });
});
describe("txlineFetch", () => {
  it("uses the mainnet API host when TXLINE_NETWORK=mainnet", async () => {
    vi.stubEnv("TXLINE_NETWORK", "mainnet");
    vi.stubEnv("TXLINE_JWT", "JWT123");
    vi.stubEnv("TXLINE_API_TOKEN", "TOK456");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(txlineFetch("/api/fixtures/snapshot")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://txline.txodds.com/api/fixtures/snapshot",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer JWT123",
          "X-Api-Token": "TOK456",
        }),
      })
    );
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
