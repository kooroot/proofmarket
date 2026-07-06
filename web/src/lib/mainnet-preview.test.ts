import { describe, expect, it } from "vitest";
import { buildMainnetFixturePreview } from "./mainnet-preview";

describe("buildMainnetFixturePreview", () => {
  it("normalizes TxLINE mainnet fixtures into a compact preview catalog", () => {
    const preview = buildMainnetFixturePreview([
      {
        FixtureId: 18192996,
        Participant1: "Mexico",
        Participant2: "England",
        Competition: "World Cup",
        StartTime: 1783299600000,
      },
      {
        FixtureId: 18143850,
        Participant1: "Vietnam",
        Participant2: "Myanmar",
        Competition: "Friendlies",
        StartTime: 1784386800000,
      },
    ]);

    expect(preview.network).toBe("mainnet");
    expect(preview.count).toBe(2);
    expect(preview.fixtures[0]).toEqual({
      fixtureId: 18192996,
      participant1: "Mexico",
      participant2: "England",
      competition: "World Cup",
      startTimeMs: 1783299600000,
      markets: [
        "Match Winner",
        "Over / Under Goals",
        "Team Goals",
        "Corners Micro Market",
      ],
    });
  });

  it("limits fixture cards while preserving the upstream count", () => {
    const fixtures = Array.from({ length: 12 }, (_, i) => ({
      FixtureId: 1000 + i,
      Participant1: `Team ${i}A`,
      Participant2: `Team ${i}B`,
      Competition: "World Cup",
      StartTime: 1783299600000 + i,
    }));

    const preview = buildMainnetFixturePreview(fixtures, 4);

    expect(preview.count).toBe(12);
    expect(preview.fixtures).toHaveLength(4);
  });
});
