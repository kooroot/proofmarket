import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Fixture } from "./types.ts";

export const WC_FIXTURES_PATH = fileURLToPath(new URL("../../fixtures/wc-fixtures.json", import.meta.url));

const REQUIRED = ["FixtureId", "StartTime", "CompetitionId", "Participant1Id", "Participant2Id", "Participant1IsHome"] as const;

export function loadFixtures(path: string = WC_FIXTURES_PATH): Fixture[] {
  const arr = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(arr)) throw new Error(`fixtures file ${path} is not an array`);
  for (const f of arr) {
    for (const k of REQUIRED) {
      if (f[k] === undefined || f[k] === null) throw new Error(`fixture ${f?.FixtureId} missing ${k}`);
    }
  }
  return arr as Fixture[];
}
