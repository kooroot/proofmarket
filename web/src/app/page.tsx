"use client";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
export default function MarketList() {
  const { data, isLoading } = useMarkets();
  if (isLoading) return <div className="mx-auto max-w-3xl space-y-3 px-3 py-4 sm:p-6">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!data?.length) return <div className="mx-auto max-w-3xl px-3 py-4 text-zinc-400 sm:p-6">No live markets — <Link className="text-emerald-400" href="/replay/18172280">try Replay demo →</Link></div>;
  return <div className="mx-auto grid max-w-3xl gap-3 px-3 py-4 sm:p-6">{data.map(m => <MarketCard key={m.pda} m={m} label="" pFair={null} />)}</div>;
}
