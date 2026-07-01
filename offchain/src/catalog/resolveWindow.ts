/**
 * LOCKED DECISION 6 / spec §2.8: a market's on-chain `resolve_after_ts_ms` is the kickoff
 * (fixture StartTime, ms) plus a fixed 150-minute margin that covers 90' + stoppage + ET +
 * penalties. It is the staker-visible "resolution opens at" trust parameter and the only
 * on-chain finality anchor — the UI MUST surface it (see the P3.14 Market-Detail screen).
 */
export const RESOLVE_WINDOW_MS = 150 * 60 * 1000; // 9_000_000

/** Pure: kickoff(ms) -> resolve_after_ts(ms). No clock dependency, fully deterministic. */
export function resolveAfterTsMs(kickoffMs: number): number {
  return kickoffMs + RESOLVE_WINDOW_MS;
}
