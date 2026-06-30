import { test, expect } from "bun:test";
import { epochDayFromTs, dailyScoresRootsPda, TXORACLE_PROGRAM_ID } from "../src/keeper/epochDay.ts";

test("anchor ts -> epochDay 20634 (verified live)", () => {
  expect(epochDayFromTs(1782788706633)).toBe(20634);
});

test("epochDay 20634 -> the verified on-chain root PDA", () => {
  expect(dailyScoresRootsPda(20634).toBase58()).toBe("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
});

test("txoracle program id is the pinned devnet id", () => {
  expect(TXORACLE_PROGRAM_ID.toBase58()).toBe("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
});

test("ts producing an out-of-u16 epochDay throws", () => {
  expect(() => epochDayFromTs(99999999 * 86_400_000)).toThrow(/u16/);
});
