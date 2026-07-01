import { test, expect } from "bun:test";
import { resolveAfterTsMs, RESOLVE_WINDOW_MS } from "../src/catalog/resolveWindow.ts";
import { buildCatalogForFixture } from "../src/catalog/generate.ts";
import type { Fixture } from "../src/catalog/types.ts";

const FX: Fixture = {
  FixtureId: 18172280, StartTime: 1782781200000, CompetitionId: 72,
  Participant1Id: 2161, Participant2Id: 2530, Participant1IsHome: true,
};

test("RESOLVE_WINDOW_MS is exactly 150 minutes (LOCKED DECISION 6)", () => {
  expect(RESOLVE_WINDOW_MS).toBe(150 * 60 * 1000);
  expect(RESOLVE_WINDOW_MS).toBe(9_000_000);
});

test("resolveAfterTsMs adds 150 min to kickoff", () => {
  expect(resolveAfterTsMs(1782781200000)).toBe(1782781200000 + 9_000_000);
});

test("derivation is pure / deterministic", () => {
  expect(resolveAfterTsMs(0)).toBe(9_000_000);
  expect(resolveAfterTsMs(1)).toBe(resolveAfterTsMs(1));
});

test("every generated market sets resolveAfterTs = kickoff + 150 min (NOT Date.now())", () => {
  for (const m of buildCatalogForFixture(FX)) {
    expect(m.resolveAfterTs).toBe(resolveAfterTsMs(FX.StartTime));
    expect(m.resolveAfterTs).toBeGreaterThan(m.lockTs); // resolution opens strictly after kickoff/lock
  }
});
