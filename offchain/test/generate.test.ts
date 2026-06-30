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

test("every v1 market is single-stat GreaterThan on a monotone key (matches create_market guard)", () => {
  for (const m of buildCatalogForFixture(FX)) {
    expect(m.predicates.length).toBe(1);
    expect(m.combinatorCode).toBe(0);
    const p = m.predicates[0];
    expect(p.comparisonCode).toBe(0); // GreaterThan
    expect(p.opCode).toBe(0);         // none
    expect(p.statKeyB).toBe(0);       // single-stat
    expect(isMonotoneKey(p.statKeyA)).toBe(true);
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
