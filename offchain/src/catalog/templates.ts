import type { MarketTemplate, Predicate } from "./types.ts";

/**
 * Submission demo core: World Cup football markets over verified monotone keys
 * [1,2,7,8] = participant goals + corners.
 *
 * - Match Winner: P1 goals - P2 goals > 0 (two-stat validation)
 * - Over/Under Goals: P1 goals + P2 goals > 2 (integer equivalent of over 2.5)
 * - Team Goals: P1 goals > 1 (single-stat validation)
 * - Corners Micro Market: P1 corners - P2 corners > 0 (two-stat validation)
 *
 * Cards (keys 3/4/5/6) remain excluded until the TxLINE key mapping is verified in
 * the feed and added to the on-chain allowlist.
 */
export const V1_TEMPLATES: MarketTemplate[] = [
  { id: "match_winner_p1", statKeyA: 1, statKeyB: 2, opCode: 2, threshold: 0 },
  { id: "total_goals_over_2_5", statKeyA: 1, statKeyB: 2, opCode: 1, threshold: 2 },
  { id: "p1_team_goals_over_1_5", statKeyA: 1, threshold: 1 },
  { id: "p1_corners_matchup", statKeyA: 7, statKeyB: 8, opCode: 2, threshold: 0 },
];

export function templateToPredicate(t: MarketTemplate): Predicate {
  return {
    statKeyA: t.statKeyA,
    statKeyB: t.statKeyB ?? 0,
    opCode: t.statKeyB === undefined ? 0 : (t.opCode ?? 0),
    comparisonCode: 0,
    threshold: t.threshold,
  };
}
