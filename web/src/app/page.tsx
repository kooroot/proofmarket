"use client";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { MainnetFixturePreviewPanel } from "@/components/MainnetFixturePreview";
import { Skeleton } from "@/components/ui/skeleton";
import { useMainnetFixturePreview } from "@/hooks/useMainnetFixturePreview";
import { demoFixtureForMarket, isFeaturedDemoMarket } from "@/lib/demo-market";
import Link from "next/link";
export default function MarketList() {
  const { data, isLoading } = useMarkets();
  const mainnetPreview = useMainnetFixturePreview();
  const markets = data ?? [];
  const featuredMarkets = markets.filter(isFeaturedDemoMarket);
  const statProofMarkets = markets.filter((market) => !isFeaturedDemoMarket(market));
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-3 py-4 sm:p-6">
      <MainnetFixturePreviewPanel
        preview={mainnetPreview.data}
        isLoading={mainnetPreview.isLoading}
        isError={mainnetPreview.isError}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Executable devnet settlement demo
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Stake, settle, and inspect proof receipts
            </h2>
          </div>
          <Link className="text-sm text-emerald-500" href="/replay/18172280">
            Replay demo
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !markets.length ? (
          <div className="text-zinc-400">
            No live devnet markets.{" "}
            <Link className="text-emerald-400" href="/replay/18172280">
              Try Replay demo
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-2">
              {featuredMarkets.map((m) => (
                <MarketCard
                  key={m.pda}
                  m={m}
                  label=""
                  pFair={null}
                  demoFixture={demoFixtureForMarket(m, mainnetPreview.data?.fixtures)}
                />
              ))}
            </div>

            {statProofMarkets.length ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Additional TxLINE stat proof checks
                </div>
                <div className="grid gap-3 opacity-85 lg:grid-cols-2">
                  {statProofMarkets.map((m) => (
                    <MarketCard
                      key={m.pda}
                      m={m}
                      label=""
                      pFair={null}
                      demoFixture={demoFixtureForMarket(m, mainnetPreview.data?.fixtures)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
