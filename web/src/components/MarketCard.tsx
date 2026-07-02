"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwinBar } from "./TwinBar";
import { impliedProbYes, formatUsdc } from "@/lib/parimutuel";
import { predicateToText } from "@/lib/predicate";
import { STATE, type UiMarket } from "@/lib/market";
/** "42478m" reads like a bug — show the two most significant units instead (29d 12h / 3h 5m / 42m). */
function fmtLockIn(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins >= 2 * 24 * 60) return `${Math.floor(mins / (24 * 60))}d ${Math.floor((mins % (24 * 60)) / 60)}h`;
  if (mins >= 120) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}
export function MarketCard({ m, label, pFair, progress }: { m: UiMarket; label: string; pFair: number | null; progress?: { value: number; threshold: number } }) {
  const p = impliedProbYes(m.yesPool, m.noPool); const total = m.yesPool + m.noPool;
  const lockIn = Math.max(0, Number(m.lockTs) - Date.now());
  return (
    <Link href={m.state === STATE.Resolved ? `/m/${m.pda}/receipt` : `/m/${m.pda}`}>
      <Card className="p-4 space-y-2 hover:border-emerald-500/50 transition">
        <div className="flex justify-between"><span className="font-medium">{predicateToText({ label, statAKey: m.statAKey, op: m.op, comparison: m.comparison, threshold: m.threshold })}</span>
          {m.state === STATE.Resolved ? <Badge className="bg-emerald-600">Proof ✓</Badge> : <Badge variant="outline" className="shrink-0 whitespace-nowrap">{lockIn > 0 ? `lock in ${fmtLockIn(lockIn)}` : "Awaiting result"}</Badge>}</div>
        {pFair !== null || !progress ? <TwinBar pYes={p ?? 0} pFair={pFair} />
          : <div className="text-sm text-zinc-400">{progress.value} / threshold {progress.threshold}</div>}
        <div className="text-xs text-zinc-500">Volume ${formatUsdc(total)}</div>
      </Card>
    </Link>
  );
}
