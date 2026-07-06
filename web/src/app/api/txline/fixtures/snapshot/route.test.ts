// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const txlineFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/txline-fetch", () => ({
  txlineFetch: txlineFetchMock,
}));

describe("GET /api/txline/fixtures/snapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    txlineFetchMock.mockReset();
  });

  it("returns a mainnet fixture preview without exposing credentials", async () => {
    txlineFetchMock.mockResolvedValue([
      {
        FixtureId: 18192996,
        Participant1: "Mexico",
        Participant2: "England",
        Competition: "World Cup",
        StartTime: 1783299600000,
      },
    ]);
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(txlineFetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/api\/fixtures\/snapshot\?startEpochDay=\d+&competitionId=72$/
      ),
      "mainnet"
    );
    expect(body.count).toBe(1);
    expect(body.fixtures[0].fixtureId).toBe(18192996);
    expect(JSON.stringify(body)).not.toContain("TXLINE_API_TOKEN");
    expect(JSON.stringify(body)).not.toContain("Bearer");
  });

  it("fails closed when TxLINE mainnet data cannot be fetched", async () => {
    txlineFetchMock.mockRejectedValue(new Error("missing credentials"));
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("mainnet fixture preview unavailable");
  });
});
