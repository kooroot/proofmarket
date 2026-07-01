/** UNVERIFIED §6b: offer decimal is stored ×1000 and StablePrice is de-margined, so 1000/oddsField ≈ P(YES). Label "indicative" in UI until Phase-0 §4.11A item 5 confirms prices[]/price_names[] units. */
export function fairProbFromOdds(oddsField: number): number | null {
  if (!Number.isFinite(oddsField) || oddsField <= 0) return null;
  const p = 1000 / oddsField; return p > 0 && p <= 1 ? p : null;
}
