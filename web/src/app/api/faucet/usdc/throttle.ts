import { PublicKey } from "@solana/web3.js";

export const WINDOW_MS = 3_600_000;
export const SOL_GRANT_LAMPORTS = 10_000_000;       // 0.01 SOL gas grant to a fresh wallet
export const SOL_BUDGET_LAMPORTS = 2_000_000_000;   // 2 SOL global cap on gas grants per window

export function allow(pk: string, m: Map<string, number>, now: number): boolean {
  for (const [k, t] of m) if (now - t >= WINDOW_MS) m.delete(k); // prune expired -> bounded memory
  const last = m.get(pk);
  if (last && now - last < WINDOW_MS) return false;
  m.set(pk, now);
  return true;
}

// Global sliding-window budget for SOL gas grants. The per-pubkey `allow` is bypassable by
// cycling fresh pubkeys; this bounds TOTAL authority outflow so the faucet cannot be drained.
export type SolBudget = { windowStart: number; spent: number };
export function allowSolGrant(b: SolBudget, now: number, grant: number): boolean {
  if (now - b.windowStart >= WINDOW_MS) { b.windowStart = now; b.spent = 0; }
  if (b.spent + grant > SOL_BUDGET_LAMPORTS) return false;
  b.spent += grant;
  return true;
}

export function isValidPubkey(s: unknown): s is string {
  if (typeof s !== "string" || s.length === 0) return false;
  try { new PublicKey(s); return true; } catch { return false; }
}
