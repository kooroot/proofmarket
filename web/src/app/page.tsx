"use client";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { MainnetFixturePreview } from "@/components/MainnetFixturePreview";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
export default function MarketList() {
  const { data, isLoading } = useMarkets();
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-3 py-4 sm:p-6">
      <MainnetFixturePreview />

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
        ) : !data?.length ? (
          <div className="text-zinc-400">
            No live devnet markets.{" "}
            <Link className="text-emerald-400" href="/replay/18172280">
              Try Replay demo
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.map((m) => (
              <MarketCard key={m.pda} m={m} label="" pFair={null} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
