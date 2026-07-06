import { test, expect } from "bun:test";
import { buildCatalogForFixture, generateCatalog, V1_TEMPLATES } from "../src/catalog/generate.ts";
import { isMonotoneKey } from "../src/catalog/keys.ts";
import { deriveMarketId } from "../src/catalog/marketId.ts";
import type { Fixture } from "../src/catalog/types.ts";

const FX: Fixture = {
  FixtureId: 18172280, StartTime: 1782781200000, CompetitionId: 72,
  Participant1Id: 2161, Participant2Id: 2530, Participant1IsHome: true,
};

test("emits one market per template", () => {
  expect(buildCatalogForFixture(FX).length).toBe(V1_TEMPLATES.length);
});

test("catalog includes the four submission market shapes", () => {
  const byId = new Map(buildCatalogForFixture(FX).map((m) => [m.templateId, m.predicates[0]]));

  expect(byId.get("match_winner_p1")!).toMatchObject({
    statKeyA: 1,
    statKeyB: 2,
    opCode: 2,
    comparisonCode: 0,
    threshold: 0,
  });
  expect(byId.get("total_goals_over_2_5")!).toMatchObject({
    statKeyA: 1,
    statKeyB: 2,
    opCode: 1,
    comparisonCode: 0,
    threshold: 2,
  });
  expect(byId.get("p1_team_goals_over_1_5")!).toMatchObject({
    statKeyA: 1,
    statKeyB: 0,
    opCode: 0,
    comparisonCode: 0,
    threshold: 1,
  });
  expect(byId.get("p1_corners_matchup")!).toMatchObject({
    statKeyA: 7,
    statKeyB: 8,
    opCode: 2,
    comparisonCode: 0,
    threshold: 0,
  });
});

test("every generated predicate uses GreaterThan on monotone stat keys supported by create_market", () => {
  for (const m of buildCatalogForFixture(FX)) {
    expect(m.predicates.length).toBe(1);
    expect(m.combinatorCode).toBe(0);
    const p = m.predicates[0];
    expect(p.comparisonCode).toBe(0); // GreaterThan
    expect(isMonotoneKey(p.statKeyA)).toBe(true);
    if (p.statKeyB === 0) {
      expect(p.opCode).toBe(0);
    } else {
      expect([1, 2]).toContain(p.opCode);
      expect(isMonotoneKey(p.statKeyB)).toBe(true);
    }
  }
});

test("stored market_id matches the deterministic derivation over (base, title)", () => {
  const m = buildCatalogForFixture(FX)[0];
  expect(deriveMarketId(
    { fixtureId: m.fixtureId, marketScopePeriod: m.marketScopePeriod, combinatorCode: m.combinatorCode, predicates: m.predicates },
    m.title,
  )).toBe(m.marketId);
});

test("lockTs == fixture StartTime", () => {
  expect(buildCatalogForFixture(FX)[0].lockTs).toBe(FX.StartTime);
});

test("generateCatalog fans out over all fixtures", () => {
  expect(generateCatalog([FX, { ...FX, FixtureId: 19000001 }]).length).toBe(2 * V1_TEMPLATES.length);
});
