export const WINDOW_MS = 3_600_000;
export function allow(pk: string, m: Map<string, number>, now: number): boolean {
  const last = m.get(pk);
  if (last && now - last < WINDOW_MS) return false;
  m.set(pk, now);
  return true;
}
