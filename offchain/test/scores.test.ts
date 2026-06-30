import { test, expect } from "bun:test";
import { decodeScoresRecord, statValue, totalGoals } from "../src/ingestion/scores.ts";

const RAW = {
  FixtureId: 18172280, StartTime: 1782781200000, CompetitionId: 72,
  Seq: 1068, Ts: 1782788706633, StatusId: 7, Confirmed: false,
  Clock: { Running: true, Seconds: 5489 },
  Stats: { "1": 1, "2": 1, "3": 0, "4": 1, "7": 5, "8": 7 },
};

test("decodes the keyed Stats map with numeric keys", () => {
  const r = decodeScoresRecord(RAW);
  expect(r.fixtureId).toBe(18172280);
  expect(r.seq).toBe(1068);
  expect(r.ts).toBe(1782788706633);
  expect(r.statusId).toBe(7);
  expect(r.confirmed).toBe(false);
  expect(r.stats[1]).toBe(1);
  expect(r.stats[8]).toBe(7);
});

test("?-? fix: P1 and P2 goals are SEPARATE keyed stats, never a parsed scoreline", () => {
  const r = decodeScoresRecord(RAW);
  expect(statValue(r, 1)).toBe(1); // P1
  expect(statValue(r, 2)).toBe(1); // P2
  expect(totalGoals(r)).toBe(2);   // total = Add(1,2)
});

test("absent key reads as 0", () => {
  expect(statValue(decodeScoresRecord(RAW), 5)).toBe(0);
});
