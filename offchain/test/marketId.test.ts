import { test, expect } from "bun:test";
import { deriveMarketId } from "../src/catalog/marketId.ts";
import { renderTitle } from "../src/catalog/title.ts";
import type { MarketDefinitionBase } from "../src/catalog/types.ts";

const def = (statKeyA: number, threshold: number, fixtureId = 18172280): MarketDefinitionBase => ({
  fixtureId, marketScopePeriod: 0, combinatorCode: 0,
  predicates: [{ statKeyA, statKeyB: 0, opCode: 0, comparisonCode: 0, threshold }],
});
const id = (d: MarketDefinitionBase) => deriveMarketId(d, renderTitle(d));

test("same predicate -> same market_id (deterministic)", () => {
  expect(id(def(1, 0))).toBe(id(def(1, 0)));
});

test("different threshold -> different market_id", () => {
  expect(id(def(1, 0))).not.toBe(id(def(1, 1)));
});

test("different statKey -> different market_id", () => {
  expect(id(def(1, 0))).not.toBe(id(def(2, 0)));
});

test("different fixture -> different market_id", () => {
  expect(id(def(1, 0, 18172280))).not.toBe(id(def(1, 0, 99999999)));
});

test("predicate-array binding: a second sub-predicate changes the id", () => {
  const single = def(1, 0);
  const compound: MarketDefinitionBase = {
    ...single, combinatorCode: 1,
    predicates: [
      { statKeyA: 1, statKeyB: 0, opCode: 0, comparisonCode: 0, threshold: 0 },
      { statKeyA: 2, statKeyB: 0, opCode: 0, comparisonCode: 0, threshold: 0 },
    ],
  };
  expect(id(single)).not.toBe(deriveMarketId(compound, renderTitle(compound)));
});

test("title binding: a different title yields a different id for the same predicate", () => {
  const d = def(1, 0);
  expect(deriveMarketId(d, "P1 Goals GreaterThan 0")).not.toBe(deriveMarketId(d, "MISLABELED"));
});

test("result fits u64", () => {
  expect(id(def(1, 0)) < (1n << 64n)).toBe(true);
});
