"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwinBar } from "./TwinBar";
import { impliedProbYes, formatUsdc } from "@/lib/parimutuel";
import { predicateToText } from "@/lib/predicate";
import { STATE, type UiMarket } from "@/lib/market";
import { demoMarketCopy } from "@/lib/demo-market";
import type { MainnetFixturePreviewItem } from "@/lib/mainnet-preview";
/** "42478m" reads like a bug — show the two most significant units instead (29d 12h / 3h 5m / 42m). */
function fmtLockIn(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins >= 2 * 24 * 60) return `${Math.floor(mins / (24 * 60))}d ${Math.floor((mins % (24 * 60)) / 60)}h`;
  if (mins >= 120) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}
export function MarketCard({ m, label, pFair, progress, demoFixture }: { m: UiMarket; label: string; pFair: number | null; progress?: { value: number; threshold: number }; demoFixture?: MainnetFixturePreviewItem | null }) {
  const p = impliedProbYes(m.yesPool, m.noPool); const total = m.yesPool + m.noPool;
  const lockIn = Math.max(0, Number(m.lockTs) - Date.now());
  const predicate = predicateToText({ label, statAKey: m.statAKey, statBKey: m.statBKey, op: m.op, comparison: m.comparison, threshold: m.threshold });
  const demo = demoFixture ? demoMarketCopy(m, demoFixture) : null;
  return (
    <Link href={m.state === STATE.Resolved ? `/m/${m.pda}/receipt` : `/m/${m.pda}`}>
      <Card className="space-y-3 p-3 transition hover:border-emerald-500/50 sm:p-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {demo ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{demo.marketType}</Badge>
                  <span className="text-xs text-zinc-500">{demo.fixtureTitle}</span>
                </div>
                <span className="block min-w-0 break-words font-medium leading-snug">{demo.question}</span>
              </>
            ) : (
              <span className="block min-w-0 break-words font-medium leading-snug">{predicate}</span>
            )}
          </div>
          {m.state === STATE.Resolved ? <Badge className="bg-emerald-600">Proof ✓</Badge> : <Badge variant="outline" className="shrink-0 whitespace-nowrap">{lockIn > 0 ? `lock in ${fmtLockIn(lockIn)}` : "Awaiting result"}</Badge>}</div>
        {demo ? (
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700 dark:text-emerald-300">
              {demo.yesLabel}
            </div>
            <div className="rounded border border-zinc-300 bg-zinc-50 px-2 py-1 font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {demo.noLabel}
            </div>
          </div>
        ) : null}
        {pFair !== null || !progress ? <TwinBar pYes={p ?? 0} pFair={pFair} />
          : <div className="text-sm text-zinc-400">{progress.value} / threshold {progress.threshold}</div>}
        <div className="flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:gap-x-3">
          <span>Volume ${formatUsdc(total)}</span>
          {demo ? <span>TxLINE mainnet fixtureId {demo.mainnetFixtureId}</span> : null}
          {demo ? <span>Resolve predicate {demo.resolvePredicate}</span> : null}
        </div>
      </Card>
    </Link>
  );
}
