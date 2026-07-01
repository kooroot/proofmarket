/**
 * v1 monotone-cumulative allowlist. MUST stay byte-identical to the Phase-1 Rust
 * MONOTONE_CUMULATIVE_KEYS constant (programs/proofmarket/src/constants.rs:34 = [1,2,7,8]).
 * These values only increase during play then freeze at full-time, which (with
 * resolve_after_ts past the whistle) makes GreaterThan settlement sound under arbitrary
 * post-lock leaf choice (§2.8). v1 = goals (1,2) + corners (7,8); cards (3/4/5/6) are
 * EXCLUDED — the spec leaves their inclusion an OPEN user decision pending G3 key-mapping
 * confirmation, and the on-chain guard rejects them, so off-chain must not offer them.
 */
export const MONOTONE_CUMULATIVE_KEYS = [1, 2, 7, 8] as const;

const LABELS: Record<number, string> = {
  1: "P1 Goals", 2: "P2 Goals",
  7: "P1 Corners", 8: "P2 Corners",
  // cards 3/4/5/6 intentionally absent: not in the on-chain allowlist and their
  // participant/colour key-mapping is unconfirmed (verify-never-guess).
};

export function isMonotoneKey(key: number): boolean {
  return (MONOTONE_CUMULATIVE_KEYS as readonly number[]).includes(key);
}

export function statKeyLabel(key: number): string {
  const l = LABELS[key];
  if (l === undefined) throw new Error(`unknown stat key ${key}`);
  return l;
}
