import { test, expect } from "bun:test";
import { renderTitle } from "../src/catalog/title.ts";
import type { MarketDefinitionBase } from "../src/catalog/types.ts";

const base = (statKeyA: number, threshold: number): MarketDefinitionBase => ({
  fixtureId: 18172280, marketScopePeriod: 0, combinatorCode: 0,
  predicates: [{ statKeyA, statKeyB: 0, opCode: 0, comparisonCode: 0, threshold }],
});

test("renders a deterministic canonical title bound to the predicate", () => {
  expect(renderTitle(base(1, 0))).toBe("P1 Goals GreaterThan 0");
  expect(renderTitle(base(7, 4))).toBe("P1 Corners GreaterThan 4");
});

test("renders two-stat add/subtract predicates used by the football markets", () => {
  expect(renderTitle({
    fixtureId: 18172280,
    marketScopePeriod: 0,
    combinatorCode: 0,
    predicates: [{ statKeyA: 1, statKeyB: 2, opCode: 2, comparisonCode: 0, threshold: 0 }],
  })).toBe("(P1 Goals Subtract P2 Goals) GreaterThan 0");

  expect(renderTitle({
    fixtureId: 18172280,
    marketScopePeriod: 0,
    combinatorCode: 0,
    predicates: [{ statKeyA: 1, statKeyB: 2, opCode: 1, comparisonCode: 0, threshold: 2 }],
  })).toBe("(P1 Goals Add P2 Goals) GreaterThan 2");
});

test("same predicate -> identical title (idempotent renderer)", () => {
  expect(renderTitle(base(2, 1))).toBe(renderTitle(base(2, 1)));
});
