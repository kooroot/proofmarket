const KEY_TO_STAT: Record<number, string> = { 1: "P1 goals", 2: "P2 goals", 3: "P1 yellow cards", 4: "P2 yellow cards", 5: "P1 red cards", 6: "P2 red cards", 7: "P1 corners", 8: "P2 corners" };
const CMP: Record<number, string> = { 0: ">", 1: "<", 2: "=" }; // GreaterThan, LessThan, EqualTo
export interface PredicateInput { label: string; statAKey: number; statBKey?: number | null; op: number | null; comparison: number; threshold: number; }
export function statKeyLabel(key: number): string {
  return KEY_TO_STAT[key] ?? `stat ${key}`;
}
export function predicateToText(m: PredicateInput): string {
  if (m.label && m.label.trim().length > 0) return m.label;        // authored = human source of truth
  if (m.statBKey !== undefined && m.statBKey !== null && m.statBKey !== 0) {
    const op = m.op === 1 ? "-" : "+";
    return `${statKeyLabel(m.statAKey)} ${op} ${statKeyLabel(m.statBKey)} ${CMP[m.comparison] ?? "?"} ${m.threshold}`;
  }
  const stat = m.op === 0 && (m.statAKey === 7 || m.statAKey === 8) ? "total corners" : statKeyLabel(m.statAKey);
  return `${stat} ${CMP[m.comparison] ?? "?"} ${m.threshold}`;
}
