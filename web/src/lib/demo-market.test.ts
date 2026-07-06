import { describe, expect, it } from "vitest";
import {
  demoFixtureForMarket,
  demoMarketCopy,
  WORLD_CUP_DEMO_FIXTURES,
} from "./demo-market";
import type { UiMarket } from "./market";

function market(overrides: Partial<UiMarket>): UiMarket {
  return {
    pda: "Market1111111111111111111111111111111111",
    marketId: 1n,
    fixtureId: 18172280n,
    statAKey: 1,
    statAPeriod: 7,
    statBKey: null,
    statBPeriod: null,
    op: null,
    threshold: 0,
    comparison: 0,
    yesPool: 110_000_000n,
    noPool: 90_000_000n,
    feeBps: 100,
    lockTs: 1785921119045n,
    state: 0,
    outcome: 0,
    ...overrides,
  };
}

describe("demo market copy", () => {
  it("maps devnet market ids to World Cup fixture names from the mainnet preview", () => {
    const fixtures = WORLD_CUP_DEMO_FIXTURES.slice(0, 4);

    expect(demoFixtureForMarket(market({ marketId: 1n }), fixtures)?.fixtureId).toBe(
      fixtures[0].fixtureId
    );
    expect(demoFixtureForMarket(market({ marketId: 5n }), fixtures)?.fixtureId).toBe(
      fixtures[1].fixtureId
    );
    expect(demoFixtureForMarket(market({ marketId: 7n }), fixtures)?.fixtureId).toBe(
      fixtures[3].fixtureId
    );
  });

  it("turns a single-stat devnet market into YES/NO copy using fixture teams", () => {
    const fixture = WORLD_CUP_DEMO_FIXTURES[0];
    const copy = demoMarketCopy(market({ statAKey: 1 }), fixture);

    expect(copy.fixtureTitle).toBe("USA vs Belgium");
    expect(copy.marketType).toBe("Team Goals");
    expect(copy.question).toBe("Will USA score at least once?");
    expect(copy.yesLabel).toBe("YES: USA scores");
    expect(copy.noLabel).toBe("NO: USA does not score");
    expect(copy.resolvePredicate).toBe("P1 goals > 0");
  });

  it("uses corner micro-market copy for football stat keys", () => {
    const fixture = WORLD_CUP_DEMO_FIXTURES[2];
    const copy = demoMarketCopy(market({ statAKey: 8 }), fixture);

    expect(copy.marketType).toBe("Corners Micro Market");
    expect(copy.question).toBe("Will Egypt record a corner?");
    expect(copy.yesLabel).toBe("YES: Egypt corner recorded");
    expect(copy.noLabel).toBe("NO: no Egypt corner");
  });
});
