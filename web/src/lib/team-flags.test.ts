import { describe, expect, it } from "vitest";
import { fixtureTitleWithFlags, teamFlag } from "./team-flags";
import type { MainnetFixturePreviewItem } from "./mainnet-preview";

describe("team flags", () => {
  it("returns flag icons for World Cup teams used in the demo", () => {
    expect(teamFlag("USA")).toBe("🇺🇸");
    expect(teamFlag("England")).toBe("🏴");
    expect(teamFlag("Switzerland")).toBe("🇨🇭");
  });

  it("formats fixture titles with flags without hiding team names", () => {
    const fixture: MainnetFixturePreviewItem = {
      fixtureId: 18193785,
      participant1: "USA",
      participant2: "Belgium",
      competition: "World Cup",
      startTimeMs: 1783382400000,
      markets: [],
    };

    expect(fixtureTitleWithFlags(fixture)).toBe("🇺🇸 USA vs 🇧🇪 Belgium");
  });
});
