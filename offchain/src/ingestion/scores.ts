export interface ScoresRecord {
  fixtureId: number;
  seq: number;
  ts: number;
  statusId: number;     // numeric Game-Phase ID (7=ET1); GameState string is unreliable (§3.6)
  confirmed: boolean;
  stats: Record<number, number>;
  clockRunning: boolean;
  clockSeconds: number;
}

export function decodeScoresRecord(raw: any): ScoresRecord {
  const stats: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw?.Stats ?? {})) stats[Number(k)] = Number(v);
  return {
    fixtureId: Number(raw.FixtureId),
    seq: Number(raw.Seq),
    ts: Number(raw.Ts),
    statusId: Number(raw.StatusId),
    confirmed: Boolean(raw.Confirmed),
    stats,
    clockRunning: Boolean(raw?.Clock?.Running),
    clockSeconds: Number(raw?.Clock?.Seconds ?? 0),
  };
}

/** Read one keyed stat; absent => 0 (period stats can 404/absent before their phase exists, §3.6). */
export function statValue(rec: ScoresRecord, key: number): number {
  return rec.stats[key] ?? 0;
}

/** Totals are sums of the two participant keys — never a pre-summed field (§3.6). */
export function totalGoals(rec: ScoresRecord): number {
  return statValue(rec, 1) + statValue(rec, 2);
}
