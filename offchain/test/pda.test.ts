import { test, expect } from "bun:test";
import { PublicKey } from "@solana/web3.js";

process.env.PROOFMARKET_PROGRAM_ID = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"; // fixed for determinism
const { marketPda, vaultPda } = await import("../src/catalog/pda.ts");

test("marketPda is deterministic for a given market_id", () => {
  const a = marketPda(12345n);
  const b = marketPda(12345n);
  expect(a.equals(b)).toBe(true);
});

test("different market_id -> different market PDA", () => {
  expect(marketPda(1n).equals(marketPda(2n))).toBe(false);
});

test("vaultPda is seeded on the MARKET account, not market_id", () => {
  const m = marketPda(777n);
  const v = vaultPda(m);
  // changing the market account changes the vault
  expect(vaultPda(marketPda(778n)).equals(v)).toBe(false);
  expect(v).toBeInstanceOf(PublicKey);
});
