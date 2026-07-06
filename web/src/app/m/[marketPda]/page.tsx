"use client";
import { useMarkets } from "@/hooks/useMarkets";
import { usePosition } from "@/hooks/usePosition";
import { StakePanel } from "@/components/StakePanel";
import { TwinBar } from "@/components/TwinBar";
import { impliedProbYes, multiplierIfWin, formatUsdc } from "@/lib/parimutuel";
import { predicateToText } from "@/lib/predicate";
import { STATE } from "@/lib/market";

function opSymbol(op: number | null): string {
  return op === 1 ? "-" : "+";
}

function proofStatus(state: number): string {
  if (state === STATE.Resolved) return "Proof verified";
  if (state === STATE.Void) return "Voided";
  return "Proof pending";
}

export default function MarketDetail({ params }: { params: { marketPda: string } }) {
  const { data } = useMarkets(); const m = data?.find((x) => x.pda === params.marketPda);
  const pos = usePosition(params.marketPda);
  if (!m) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Loading market…</div>;
  const mYes = multiplierIfWin(true, m.yesPool, m.noPool, m.feeBps); const mNo = multiplierIfWin(false, m.yesPool, m.noPool, m.feeBps);
  const predicate = predicateToText({ label: "", statAKey: m.statAKey, statBKey: m.statBKey, op: m.op, comparison: m.comparison, threshold: m.threshold });
  const statKeys = m.statBKey ? `${m.statAKey} ${opSymbol(m.op)} ${m.statBKey}` : `${m.statAKey}`;
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 sm:p-6">
      <h1 className="break-words text-lg font-semibold leading-snug sm:text-xl">{predicate}</h1>
      <TwinBar pYes={impliedProbYes(m.yesPool, m.noPool) ?? 0} pFair={null} />
      <div className="grid min-w-0 gap-2 rounded border border-zinc-800 bg-zinc-950/40 p-3 text-sm sm:grid-cols-2">
        <div className="min-w-0"><span className="text-zinc-500">YES pool</span><div className="font-medium text-zinc-100">${formatUsdc(m.yesPool)} ({mYes ? mYes.toFixed(2) : "—"}×)</div></div>
        <div className="min-w-0"><span className="text-zinc-500">NO pool</span><div className="font-medium text-zinc-100">${formatUsdc(m.noPool)} ({mNo ? mNo.toFixed(2) : "—"}×)</div></div>
        <div className="min-w-0"><span className="text-zinc-500">Resolve predicate</span><div className="break-words font-mono text-xs text-zinc-200">{predicate}</div></div>
        <div className="min-w-0"><span className="text-zinc-500">TxLINE fixtureId</span><div className="break-all font-mono text-xs text-zinc-200">{m.fixtureId.toString()}</div></div>
        <div className="min-w-0"><span className="text-zinc-500">statKey</span><div className="break-words font-mono text-xs text-zinc-200">{statKeys}</div></div>
        <div className="min-w-0"><span className="text-zinc-500">resolveAfter</span><div className="break-all font-mono text-xs text-zinc-200">{new Date(Number(m.lockTs)).toISOString()}</div></div>
        <div className="min-w-0"><span className="text-zinc-500">Proof status</span><div className="font-medium text-emerald-300">{proofStatus(m.state)}</div></div>
      </div>
      {pos.data && <div className="break-words text-sm text-emerald-400">Your position: YES ${formatUsdc(pos.data.yesAmount)} · NO ${formatUsdc(pos.data.noAmount)}</div>}
      <StakePanel m={m} />
      <div className="rounded border border-zinc-800 p-3 text-xs leading-relaxed text-zinc-400">This market settles by our escrow&apos;s <b>CPI into validate_stat</b> on Solana — not by a vote. <a className="text-emerald-400" href={`/m/${m.pda}/receipt`}>How resolution works →</a></div>
    </div>
  );
}
