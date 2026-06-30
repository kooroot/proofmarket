import type { MarketTemplate, Predicate } from "./types.ts";

/**
 * v1 demo core = single-stat GreaterThan on MONOTONE_CUMULATIVE_KEYS (the §3.2 TIER-0
 * GreaterThan subset, generalized to monotone keys [1,2,7,8] = goals + corners).
 * comparisonCode 0=GreaterThan, opCode 0=none, statKeyB 0=single-stat.
 * NOTE: cards (key 3/4/5/6) are EXCLUDED in v1 — not in the on-chain allowlist
 * (constants.rs:34), so no card template here (see p2.6-allowlist-decision-flag.md).
 */
export const V1_TEMPLATES: MarketTemplate[] = [
  { id: "p1_to_score", statKeyA: 1, threshold: 0 },        // P1 Goals > 0
  { id: "p2_to_score", statKeyA: 2, threshold: 0 },        // P2 Goals > 0
  { id: "p1_over_1_5", statKeyA: 1, threshold: 1 },        // P1 Goals > 1 (team total Over 1.5)
  { id: "p1_corners_over_4", statKeyA: 7, threshold: 4 },  // P1 Corners > 4
  { id: "p2_corners_over_4", statKeyA: 8, threshold: 4 },  // P2 Corners > 4 (replaces excluded card template)
];

export function templateToPredicate(t: MarketTemplate): Predicate {
  return { statKeyA: t.statKeyA, statKeyB: 0, opCode: 0, comparisonCode: 0, threshold: t.threshold };
}
