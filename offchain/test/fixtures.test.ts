import { test, expect } from "bun:test";
import { loadFixtures, WC_FIXTURES_PATH } from "../src/catalog/fixtures.ts";

test("loads the pinned static fixtures including the anchor friendly", () => {
  const fx = loadFixtures();
  expect(Array.isArray(fx)).toBe(true);
  expect(fx.some((f) => f.FixtureId === 18172280)).toBe(true);
});

test("every fixture has the required settlement fields", () => {
  for (const f of loadFixtures()) {
    expect(typeof f.FixtureId).toBe("number");
    expect(typeof f.StartTime).toBe("number");
    expect(typeof f.Participant1Id).toBe("number");
    expect(typeof f.Participant2Id).toBe("number");
    expect(typeof f.Participant1IsHome).toBe("boolean");
  }
});

test("rejects an array missing a required field", () => {
  const tmp = `${WC_FIXTURES_PATH}.bad-${Date.now()}.json`;
  Bun.write(tmp, JSON.stringify([{ FixtureId: 1 }]));
  expect(() => loadFixtures(tmp)).toThrow(/missing/);
});
