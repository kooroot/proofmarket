const KEY_TO_STAT: Record<number, string> = { 1: "P1 goals", 2: "P2 goals", 3: "yellow cards", 4: "yellow cards", 5: "red cards", 6: "red cards", 7: "corners", 8: "corners" };
const CMP: Record<number, string> = { 0: ">", 1: "<", 2: "=" }; // GreaterThan, LessThan, EqualTo
export interface PredicateInput { label: string; statAKey: number; op: number | null; comparison: number; threshold: number; }
export function predicateToText(m: PredicateInput): string {
  if (m.label && m.label.trim().length > 0) return m.label;        // authored = human source of truth
  const stat = m.op === 0 && (m.statAKey === 7 || m.statAKey === 8) ? "total corners" : (KEY_TO_STAT[m.statAKey] ?? `stat ${m.statAKey}`);
  return `${stat} ${CMP[m.comparison] ?? "?"} ${m.threshold}`;
}
