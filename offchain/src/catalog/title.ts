import { statKeyLabel } from "./keys.ts";
import type { MarketDefinitionBase } from "./types.ts";

const COMPARISON_WORD = ["GreaterThan", "LessThan", "EqualTo"];

/**
 * The ONE deterministic predicate -> string renderer. Its sha256 is folded into
 * market_id (§3.4), so the on-chain label == the stored predicate by construction.
 * v1 is single-stat; the join keeps the renderer total for the (future) compound case.
 */
export function renderTitle(def: MarketDefinitionBase): string {
  return def.predicates
    .map((p) => {
      const lhs =
        p.statKeyB === 0
          ? statKeyLabel(p.statKeyA)
          : `(${statKeyLabel(p.statKeyA)} ${p.opCode === 2 ? "Subtract" : "Add"} ${statKeyLabel(p.statKeyB)})`;
      return `${lhs} ${COMPARISON_WORD[p.comparisonCode]} ${p.threshold}`;
    })
    .join(def.combinatorCode === 2 ? " OR " : " AND ");
}
