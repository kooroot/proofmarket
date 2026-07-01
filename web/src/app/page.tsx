"use client";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
export default function MarketList() {
  const { data, isLoading } = useMarkets();
  if (isLoading) return <div className="p-6 space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!data?.length) return <div className="p-6 text-zinc-400">No live markets — <Link className="text-emerald-400" href="/replay/18172280">try Replay demo →</Link></div>;
  return <div className="p-6 grid gap-3 max-w-3xl mx-auto">{data.map(m => <MarketCard key={m.pda} m={m} label="" pFair={null} />)}</div>;
}
