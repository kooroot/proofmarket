"use client";
import { useMarkets } from "@/hooks/useMarkets";
import { usePosition } from "@/hooks/usePosition";
import { StakePanel } from "@/components/StakePanel";
import { TwinBar } from "@/components/TwinBar";
import { impliedProbYes, multiplierIfWin, formatUsdc } from "@/lib/parimutuel";
import { predicateToText } from "@/lib/predicate";
export default function MarketDetail({ params }: { params: { marketPda: string } }) {
  const { data } = useMarkets(); const m = data?.find((x) => x.pda === params.marketPda);
  const pos = usePosition(params.marketPda);
  if (!m) return <div className="p-6 text-zinc-400">Loading market…</div>;
  const mYes = multiplierIfWin(true, m.yesPool, m.noPool, m.feeBps); const mNo = multiplierIfWin(false, m.yesPool, m.noPool, m.feeBps);
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">{predicateToText({ label: "", statAKey: m.statAKey, op: m.op, comparison: m.comparison, threshold: m.threshold })}</h1>
      <TwinBar pYes={impliedProbYes(m.yesPool, m.noPool) ?? 0} pFair={null} />
      <div className="text-sm text-zinc-400">YES ${formatUsdc(m.yesPool)} ({mYes ? mYes.toFixed(2) : "—"}×) · NO ${formatUsdc(m.noPool)} ({mNo ? mNo.toFixed(2) : "—"}×) · your multiplier finalizes at lock.</div>
      {pos.data && <div className="text-sm text-emerald-400">Your position: YES ${formatUsdc(pos.data.yesAmount)} · NO ${formatUsdc(pos.data.noAmount)}</div>}
      <StakePanel m={m} />
      <div className="rounded border border-zinc-800 p-3 text-xs text-zinc-400">This market settles by our escrow&apos;s <b>CPI into validate_stat</b> on Solana — not by a vote. <a className="text-emerald-400" href={`/m/${m.pda}/receipt`}>How resolution works →</a></div>
    </div>
  );
}
