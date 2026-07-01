export interface DecodedOdds {
  fixtureId: number;
  bookmaker: string;
  superOddsType: string;
  inRunning: boolean;
  ts: number;
  outcomes: { name: string; rawPrice: number | null; pctDeVig: string | null }[];
}

/**
 * STRETCH / display-only fair-value baseline (ADD #6).
 * rawPrice is int32 with an UNDOCUMENTED scale — never divide-by-1000, never settle on it.
 * pctDeVig is the soccer-only "Stable Price" de-vig string (e.g. "52.632" | "NA").
 */
export function decodeOdds(p: any): DecodedOdds {
  const names: string[] = p?.PriceNames ?? [];
  const prices: number[] = p?.Prices ?? [];
  const pct: string[] = p?.Pct ?? [];
  return {
    fixtureId: Number(p.FixtureId),
    bookmaker: String(p?.Bookmaker ?? ""),
    superOddsType: String(p?.SuperOddsType ?? ""),
    inRunning: Boolean(p?.InRunning),
    ts: Number(p?.Ts ?? 0),
    outcomes: names.map((name, i) => ({
      name,
      rawPrice: prices[i] ?? null,
      pctDeVig: pct[i] ?? null,
    })),
  };
}
