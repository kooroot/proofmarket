"use client";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkets } from "@/hooks/useMarkets";
import { usePortfolioPositions, type PortfolioPosition } from "@/hooks/usePortfolioPositions";
import { STATE } from "@/lib/market";
import { formatUsdc } from "@/lib/parimutuel";
import { predicateToText } from "@/lib/predicate";
import { PositionRow } from "@/components/PositionRow";

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-zinc-800 p-4 text-sm text-zinc-400">{children}</div>;
}

function OpenPositionRow({ entry }: { entry: PortfolioPosition }) {
  const { market: m, position: pos } = entry;
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-800 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="break-words font-medium text-zinc-100 sm:truncate">
          {predicateToText({ label: "", statAKey: m.statAKey, statBKey: m.statBKey, op: m.op, comparison: m.comparison, threshold: m.threshold })}
        </div>
        <div className="text-zinc-400">
          YES ${formatUsdc(pos.yesAmount)} / NO ${formatUsdc(pos.noAmount)}
        </div>
      </div>
      <Link className="shrink-0 text-emerald-400" href={`/m/${m.pda}`}>
        View market →
      </Link>
    </div>
  );
}

export default function Portfolio() {
  const { publicKey } = useWallet();
  const markets = useMarkets();
  const positions = usePortfolioPositions(markets.data ?? []);

  if (markets.isLoading) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Loading markets…</div>;
  if (!publicKey) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Connect a wallet to see your positions.</div>;
  if (positions.isLoading) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Loading positions…</div>;

  const rows = positions.data ?? [];
  if (!rows.length) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">
        No positions for this wallet yet — <Link className="text-emerald-400" href="/replay/18172280">try Replay demo →</Link>
      </div>
    );
  }

  const settled = rows.filter((row) => row.market.state === STATE.Resolved);
  const open = rows.filter((row) => row.market.state !== STATE.Resolved);
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:p-6">
      <Tabs defaultValue="open">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-fit"><TabsTrigger value="open">Open ({open.length})</TabsTrigger><TabsTrigger value="settled">Settled ({settled.length})</TabsTrigger></TabsList>
        <TabsContent value="open">
          <div data-state="open" className="mt-3">
            <div className="mb-2 text-sm font-medium text-zinc-200">Open positions</div>
            {open.length ? open.map((entry) => <OpenPositionRow key={entry.position.pda} entry={entry} />) : <EmptyState>No open positions.</EmptyState>}
          </div>
        </TabsContent>
        <TabsContent value="settled">
          <div className="mt-3">
            <div className="mb-2 text-sm font-medium text-zinc-200">Settled positions</div>
            {settled.length ? settled.map((entry) => <PositionRow key={entry.position.pda} m={entry.market} pos={entry.position} />) : <EmptyState>No settled positions yet.</EmptyState>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
