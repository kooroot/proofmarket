import { describe, expect, it } from "vitest";
import { buildMainnetFixturePreview } from "./mainnet-preview";

describe("buildMainnetFixturePreview", () => {
  it("keeps only World Cup fixtures and orders them by nearest kickoff", () => {
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
      {
        FixtureId: 18193785,
        Participant1: "USA",
        Participant2: "Belgium",
        Competition: "World Cup",
        StartTime: 1783382400000,
      },
      {
        FixtureId: 18198205,
        Participant1: "Portugal",
        Participant2: "Spain",
        Competition: "World Cup",
        StartTime: 1783364400000,
      },
    ], 8, 1783380000000);

    expect(preview.network).toBe("mainnet");
    expect(preview.count).toBe(3);
    expect(preview.fixtures.map((fixture) => fixture.competition)).toEqual([
      "World Cup",
      "World Cup",
      "World Cup",
    ]);
    expect(preview.fixtures.map((fixture) => fixture.fixtureId)).toEqual([
      18193785,
      18198205,
      18192996,
    ]);
    expect(preview.fixtures[0]).toEqual({
      fixtureId: 18193785,
      participant1: "USA",
      participant2: "Belgium",
      competition: "World Cup",
      startTimeMs: 1783382400000,
      markets: [
        "Match Winner",
        "Over / Under Goals",
        "Team Goals",
        "Stat Proof Receipt",
      ],
    });
  });

  it("limits fixture cards while preserving the filtered World Cup count", () => {
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
