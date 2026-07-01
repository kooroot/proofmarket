import { test, expect } from "bun:test";
import { loadFixtures } from "../src/catalog/fixtures.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";

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
  // Write the malformed fixture to the OS temp dir (NEVER inside the tracked fixtures/ dir) and clean up after.
  const tmp = join(tmpdir(), `wc-fixtures-bad-${Date.now()}.json`);
  Bun.write(tmp, JSON.stringify([{ FixtureId: 1 }]));
  try {
    expect(() => loadFixtures(tmp)).toThrow(/missing/);
  } finally {
    rmSync(tmp, { force: true });
  }
});
