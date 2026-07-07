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
  return <div className="border-b border-rule px-1 py-6 text-[13.5px] text-ink-2">{children}</div>;
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
    <div className="flex flex-col gap-2 border-b border-rule px-1 py-[15px] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-[3px] border border-rule px-[7px] py-[2px] font-mono text-[10px] text-ink-2">
            {demo.marketIcon} {demo.marketType}
          </span>
          <span className="font-mono text-[10.5px] text-ink-2">{demo.fixtureTitle}</span>
        </div>
        <div className="break-words font-display text-[17px] sm:truncate">{demo.question}</div>
        <div className="mt-1 font-mono text-[11.5px] tabular-nums text-ink-2">
          YES ${formatUsdc(pos.yesAmount)} / NO ${formatUsdc(pos.noAmount)}
        </div>
      </div>
      <Link className="shrink-0 whitespace-nowrap font-mono text-[11.5px] text-proof hover:underline" href={`/m/${m.pda}`}>
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

  const gate = (msg: React.ReactNode) => <div className="max-w-[820px] pt-[34px] text-[13.5px] text-ink-2">{msg}</div>;
  if (markets.isLoading) return gate("Loading markets…");
  if (!publicKey) return gate("Connect a wallet to see your positions.");
  if (positions.isLoading) return gate("Loading positions…");

  const rows = positions.data ?? [];
  if (!rows.length) {
    return gate(
      <>
        No positions for this wallet yet —{" "}
        <Link className="lk" href={MAINNET_HISTORICAL_REPLAY_ROUTE}>
          try Replay demo →
        </Link>
      </>
    );
  }

  const settled = rows.filter((row) => row.market.state === STATE.Resolved);
  const open = rows.filter((row) => row.market.state !== STATE.Resolved);
  const fixtures = mainnetPreview.data?.fixtures;
  return (
    <div className="max-w-[820px] pt-[34px]" style={{ animation: "fadeUp .4s both" }}>
      <h1 className="mb-5 font-display text-[clamp(1.9rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em]">Portfolio</h1>
      <Tabs defaultValue="open">
        <TabsList className="mb-5 grid w-full grid-cols-2 sm:inline-flex sm:w-fit">
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="settled">Settled ({settled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <div data-state="open" className="border-t-2 border-ink">
            <div className="px-1 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2">Open positions</div>
            {open.length ? open.map((entry) => <OpenPositionRow key={entry.position.pda} entry={entry} fixtures={fixtures} />) : <EmptyState>No open positions.</EmptyState>}
          </div>
        </TabsContent>
        <TabsContent value="settled">
          <div className="border-t-2 border-ink">
            <div className="px-1 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2">Settled positions</div>
            {settled.length ? settled.map((entry) => <PositionRow key={entry.position.pda} m={entry.market} pos={entry.position} demoFixture={demoFixtureForMarket(entry.market, fixtures)} />) : <EmptyState>No settled positions yet.</EmptyState>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
