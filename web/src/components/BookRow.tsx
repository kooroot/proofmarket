"use client";
import Link from "next/link";
import { impliedProbYes, multiplierIfWin, formatUsdc } from "@/lib/parimutuel";
import { STATE, type UiMarket } from "@/lib/market";
import { demoMarketCopy } from "@/lib/demo-market";
import type { MainnetFixturePreviewItem } from "@/lib/mainnet-preview";

/** "42478m" reads like a bug — show the two most significant units instead. */
function fmtLockIn(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins >= 2 * 24 * 60) return `${Math.floor(mins / (24 * 60))}d ${Math.floor((mins % (24 * 60)) / 60)}h`;
  if (mins >= 120) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}
function fmtMult(x: number | null): string {
  return x === null ? "—" : `${x.toFixed(2)}×`;
}

/** One market as a newspaper ledger row (The Book on the home route). */
export function BookRow({ m, demoFixture }: { m: UiMarket; demoFixture?: MainnetFixturePreviewItem | null }) {
  const total = m.yesPool + m.noPool;
  const p = impliedProbYes(m.yesPool, m.noPool);
  const pct = p === null ? 50 : Math.round(p * 100);
  const yesMult = multiplierIfWin(true, m.yesPool, m.noPool, m.feeBps);
  const noMult = multiplierIfWin(false, m.yesPool, m.noPool, m.feeBps);
  const settled = m.state === STATE.Resolved;
  const lockIn = Math.max(0, Number(m.lockTs) - Date.now());
  const demo = demoFixture ? demoMarketCopy(m, demoFixture) : null;

  const href = settled ? `/m/${m.pda}/receipt` : `/m/${m.pda}`;
  const resolveText = settled ? "settled" : lockIn > 0 ? `T- ${fmtLockIn(lockIn)}` : "awaiting result";

  return (
    <Link
      href={href}
      className="group grid grid-cols-[minmax(0,1fr)_140px_66px_66px_92px_152px] items-center gap-3 border-b border-rule px-3 py-[15px] transition-colors hover:bg-panel-2"
    >
      <div className="min-w-0">
        <div className="mb-[5px] flex items-center gap-[9px]">
          <span className="flex-none whitespace-nowrap rounded-[3px] border border-rule px-[7px] py-[2px] font-mono text-[10px] text-ink-2">
            {demo ? `${demo.marketIcon} ${demo.marketType}` : "Market"}
          </span>
          {demo && <span className="truncate font-mono text-[10.5px] text-ink-2">{demo.fixtureTitle}</span>}
          {settled && (
            <span className="flex-none whitespace-nowrap rounded-[3px] bg-proof px-[7px] py-[2px] font-mono text-[9.5px] font-bold text-paper">
              VALIDATED ✓
            </span>
          )}
        </div>
        <div className="font-display text-[19px] leading-[1.25] transition-colors group-hover:text-proof">
          {demo ? demo.question : "—"}
        </div>
        {demo && (
          <div className="mt-1 font-mono text-[10.5px] text-ink-2">
            {demo.resolvePredicate} · fixture {demo.mainnetFixtureId}
          </div>
        )}
      </div>
      <div>
        <div className="h-[6px] overflow-hidden rounded-[2px] bg-panel-2">
          <div className="h-full bg-proof" style={{ width: `${pct}%`, animation: "barGrow .6s ease-out" }} />
        </div>
        <div className="mt-[5px] font-mono text-[12px] tabular-nums text-ink">{pct}%</div>
      </div>
      <div className="text-right text-[14px] font-semibold tabular-nums text-proof">{fmtMult(yesMult)}</div>
      <div className="text-right text-[14px] font-medium tabular-nums text-ink-2">{fmtMult(noMult)}</div>
      <div className="text-right text-[13.5px] tabular-nums">${formatUsdc(total)}</div>
      <div className="text-right font-mono text-[10px] leading-[1.4] text-ink-2">{resolveText}</div>
    </Link>
  );
}
