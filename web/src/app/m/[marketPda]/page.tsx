"use client";
import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { usePosition } from "@/hooks/usePosition";
import { StakePanel } from "@/components/StakePanel";
import { impliedProbYes, multiplierIfWin, formatUsdc } from "@/lib/parimutuel";
import { predicateToText } from "@/lib/predicate";
import { STATE, OUTCOME } from "@/lib/market";
import { demoFixtureForMarket, demoMarketCopy } from "@/lib/demo-market";
import { useMainnetFixturePreview } from "@/hooks/useMainnetFixturePreview";

function opSymbol(op: number | null): string {
  return op === 1 ? "-" : "+";
}

function proofStatus(state: number): string {
  if (state === STATE.Resolved) return "Proof verified";
  if (state === STATE.Void) return "Voided";
  return "Proof pending";
}

function outcomeLabel(outcome: number): string {
  if (outcome === OUTCOME.Yes) return "YES";
  if (outcome === OUTCOME.No) return "NO";
  return "VOID";
}

function formatResolveAfterUtc(ms: bigint): string {
  const date = new Date(Number(ms));
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${formatted} UTC`;
}

export default function MarketDetail({ params }: { params: { marketPda: string } }) {
  const { data } = useMarkets();
  const m = data?.find((x) => x.pda === params.marketPda);
  const mainnetPreview = useMainnetFixturePreview();
  const pos = usePosition(params.marketPda);
  if (!m) return <div className="max-w-[780px] pt-[34px] text-[13.5px] text-ink-2">Loading market…</div>;

  const mYes = multiplierIfWin(true, m.yesPool, m.noPool, m.feeBps);
  const mNo = multiplierIfWin(false, m.yesPool, m.noPool, m.feeBps);
  const pct = Math.round((impliedProbYes(m.yesPool, m.noPool) ?? 0) * 100);
  const predicate = predicateToText({ label: "", statAKey: m.statAKey, statBKey: m.statBKey, op: m.op, comparison: m.comparison, threshold: m.threshold });
  const demo = demoMarketCopy(m, demoFixtureForMarket(m, mainnetPreview.data?.fixtures));
  const marketBadge = `${demo.marketIcon} ${demo.marketType}`;
  const statKeys = m.statBKey ? `${m.statAKey} ${opSymbol(m.op)} ${m.statBKey}` : `${m.statAKey}`;
  const settled = m.state === STATE.Resolved;

  const specs: { k: string; v: React.ReactNode; mono?: boolean }[] = [
    { k: "YES pool", v: `$${formatUsdc(m.yesPool)} (${mYes ? mYes.toFixed(2) : "—"}×)` },
    { k: "NO pool", v: `$${formatUsdc(m.noPool)} (${mNo ? mNo.toFixed(2) : "—"}×)` },
    { k: "Resolve predicate", v: predicate, mono: true },
    { k: "TxLINE fixtureId", v: m.fixtureId.toString(), mono: true },
    { k: "Mainnet demo fixture", v: String(demo.mainnetFixtureId), mono: true },
    { k: "statKey", v: statKeys, mono: true },
    {
      k: "resolveAfter",
      v: <time dateTime={new Date(Number(m.lockTs)).toISOString()}>{formatResolveAfterUtc(m.lockTs)}</time>,
      mono: true,
    },
    { k: "Proof status", v: proofStatus(m.state) },
  ];

  return (
    <div className="max-w-[780px] pt-[34px]" style={{ animation: "fadeUp .4s both" }}>
      <Link href="/" className="lk border-0 font-mono text-[11.5px]">
        ← Index
      </Link>

      <div className="my-[18px] mb-[10px] flex flex-wrap items-center gap-[9px]">
        <span className="rounded-[3px] border border-proof px-2 py-[3px] font-mono text-[11px] text-proof">{marketBadge}</span>
        <span className="font-mono text-[11.5px] text-ink-2">{demo.fixtureTitle}</span>
        {settled && (
          <span className="whitespace-nowrap rounded-[3px] bg-proof px-2 py-[3px] font-mono text-[10px] font-bold text-paper">
            VALIDATED ✓ {outcomeLabel(m.outcome)}
          </span>
        )}
      </div>

      <h1 className="m-0 mb-[18px] break-words font-display text-[clamp(1.9rem,3.4vw,2.7rem)] font-bold leading-[1.05] tracking-[-0.03em]">
        {demo.question}
      </h1>

      <div className="mb-[22px] grid grid-cols-2 gap-[10px]">
        <div className="rounded-[3px] border border-proof bg-proof-soft px-3 py-[9px] text-[13px] font-medium text-proof">{demo.yesLabel}</div>
        <div className="rounded-[3px] border border-rule-2 px-3 py-[9px] text-[13px] font-medium text-ink-2">{demo.noLabel}</div>
      </div>

      {/* implied bar */}
      <div className="mb-[26px] flex items-center gap-[14px]">
        <div className="h-[10px] flex-1 overflow-hidden rounded-[2px] bg-panel-2">
          <div className="h-full bg-proof" style={{ width: `${pct}%`, animation: "barGrow .6s ease-out" }} />
        </div>
        <span className="font-mono text-[15px] tabular-nums">{pct}%</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">implied YES</span>
      </div>

      {/* pool ledger */}
      <div className="border-t-2 border-ink">
        {specs.map((r) => (
          <div key={r.k} className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 border-b border-rule px-1 py-[11px] sm:grid-cols-[200px_1fr]">
            <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-2">{r.k}</span>
            <span className={`min-w-0 break-words text-[13.5px] tabular-nums ${r.mono ? "font-mono text-ink-2" : "text-ink"}`}>{r.v}</span>
          </div>
        ))}
      </div>

      {pos.data && (
        <div className="mt-4 break-words text-[13.5px] text-proof">
          Your position: YES ${formatUsdc(pos.data.yesAmount)} · NO ${formatUsdc(pos.data.noAmount)}
        </div>
      )}

      {settled ? (
        <div className="mt-[26px] rounded-[4px] border border-proof bg-proof-soft p-5">
          <div className="mb-3 flex flex-wrap items-center gap-[10px]">
            <span className="rounded-[3px] bg-proof px-[9px] py-1 font-mono text-[11px] font-bold text-paper">validate_stat → TRUE</span>
            <span className="text-[13.5px] text-ink">
              Settled — outcome <b>{outcomeLabel(m.outcome)}</b>. Escrow released; no vote, no dispute window.
            </span>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            <Link
              href="/portfolio"
              className="rounded-[3px] bg-proof px-[18px] py-[11px] font-mono text-[13px] font-semibold text-paper transition hover:brightness-110"
            >
              Claim winnings →
            </Link>
            <Link
              href={`/m/${m.pda}/receipt`}
              className="rounded-[3px] border border-rule-2 px-[18px] py-[11px] font-mono text-[13px] text-ink transition-colors hover:border-proof hover:text-proof"
            >
              View proof receipt →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-[26px]">
          <StakePanel m={m} />
        </div>
      )}

      <p className="mt-[18px] border-t border-rule pt-4 text-[13px] leading-[1.6] text-ink-2">
        This market settles by our escrow&apos;s <span className="font-mono text-ink">CPI into validate_stat</span> on Solana — not
        by a vote.{" "}
        <Link href={`/m/${m.pda}/receipt`} className="lk">
          How resolution works →
        </Link>
      </p>
    </div>
  );
}
