/** side=true → YES. Fee raked on the LOSING pool only (CANONICAL CONTRACT §2.4). */
function payoutPool(side: boolean, yes: bigint, no: bigint, feeBps: number): { winning: bigint; pool: bigint } | null {
  const winning = side ? yes : no; const losing = side ? no : yes;
  if (winning === 0n || losing === 0n) return null; // one-sided ⇒ Void/refund, no parimutuel
  const fee = (losing * BigInt(feeBps)) / 10_000n; // u128 floor
  return { winning, pool: winning + (losing - fee) };
}
export function impliedProbYes(yes: bigint, no: bigint): number | null {
  const t = yes + no; return t === 0n ? null : Number(yes) / Number(t);
}
export function multiplierIfWin(side: boolean, yes: bigint, no: bigint, feeBps: number): number | null {
  const r = payoutPool(side, yes, no, feeBps); return r ? Number(r.pool) / Number(r.winning) : null;
}
export function payoutForStake(stake: bigint, side: boolean, yes: bigint, no: bigint, feeBps: number): bigint | null {
  const r = payoutPool(side, yes, no, feeBps); return r ? (stake * r.pool) / r.winning : null; // floor
}
export function formatUsdc(base: bigint, dp = 2): string {
  const neg = base < 0n; const b = neg ? -base : base;
  const frac = (b % 1_000_000n).toString().padStart(6, "0").slice(0, dp);
  return `${neg ? "-" : ""}${(b / 1_000_000n).toString()}${dp > 0 ? "." + frac : ""}`;
}
