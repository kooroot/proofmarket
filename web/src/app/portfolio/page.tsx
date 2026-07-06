"use client";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkets } from "@/hooks/useMarkets";
import { useMainnetFixturePreview } from "@/hooks/useMainnetFixturePreview";
import { usePortfolioPositions, type PortfolioPosition } from "@/hooks/usePortfolioPositions";
import { STATE } from "@/lib/market";
import { formatUsdc } from "@/lib/parimutuel";
import { PositionRow } from "@/components/PositionRow";
import {
  demoFixtureForMarket,
  demoMarketCopy,
} from "@/lib/demo-market";
import type { MainnetFixturePreviewItem } from "@/lib/mainnet-preview";
import { MAINNET_HISTORICAL_REPLAY_ROUTE } from "@/lib/replay-demo";

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-zinc-800 p-4 text-sm text-zinc-400">{children}</div>;
}

function OpenPositionRow({
  entry,
  fixtures,
}: {
  entry: PortfolioPosition;
  fixtures?: MainnetFixturePreviewItem[];
}) {
  const { market: m, position: pos } = entry;
  const demo = demoMarketCopy(m, demoFixtureForMarket(m, fixtures));
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-800 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-zinc-200">
            {demo.marketIcon} {demo.marketType}
          </span>
          <span>{demo.fixtureTitle}</span>
        </div>
        <div className="break-words font-medium text-zinc-100 sm:truncate">
          {demo.question}
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
  const mainnetPreview = useMainnetFixturePreview();
  const positions = usePortfolioPositions(markets.data ?? []);

  if (markets.isLoading) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Loading markets…</div>;
  if (!publicKey) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Connect a wallet to see your positions.</div>;
  if (positions.isLoading) return <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">Loading positions…</div>;

  const rows = positions.data ?? [];
  if (!rows.length) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-4 text-zinc-400 sm:p-6">
        No positions for this wallet yet — <Link className="text-emerald-400" href={MAINNET_HISTORICAL_REPLAY_ROUTE}>try Replay demo →</Link>
      </div>
    );
  }

  const settled = rows.filter((row) => row.market.state === STATE.Resolved);
  const open = rows.filter((row) => row.market.state !== STATE.Resolved);
  const fixtures = mainnetPreview.data?.fixtures;
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:p-6">
      <Tabs defaultValue="open">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-fit"><TabsTrigger value="open">Open ({open.length})</TabsTrigger><TabsTrigger value="settled">Settled ({settled.length})</TabsTrigger></TabsList>
        <TabsContent value="open">
          <div data-state="open" className="mt-3">
            <div className="mb-2 text-sm font-medium text-zinc-200">Open positions</div>
            {open.length ? open.map((entry) => <OpenPositionRow key={entry.position.pda} entry={entry} fixtures={fixtures} />) : <EmptyState>No open positions.</EmptyState>}
          </div>
        </TabsContent>
        <TabsContent value="settled">
          <div className="mt-3">
            <div className="mb-2 text-sm font-medium text-zinc-200">Settled positions</div>
            {settled.length ? settled.map((entry) => <PositionRow key={entry.position.pda} m={entry.market} pos={entry.position} demoFixture={demoFixtureForMarket(entry.market, fixtures)} />) : <EmptyState>No settled positions yet.</EmptyState>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
