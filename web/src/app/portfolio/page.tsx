"use client";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkets } from "@/hooks/useMarkets";
import { STATE } from "@/lib/market";
export default function Portfolio() {
  const { data } = useMarkets();
  if (!data?.length) return <div className="p-6 text-zinc-400">No positions yet — <Link className="text-emerald-400" href="/replay/18172280">try Replay demo →</Link></div>;
  const settled = data.filter((m) => m.state === STATE.Resolved); const open = data.filter((m) => m.state !== STATE.Resolved);
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Tabs defaultValue="open">
        <TabsList><TabsTrigger value="open">Open ({open.length})</TabsTrigger><TabsTrigger value="settled">Settled ({settled.length})</TabsTrigger></TabsList>
        <TabsContent value="open"><div className="text-sm text-zinc-400">Open positions load via usePosition per market.</div></TabsContent>
        <TabsContent value="settled"><div className="text-sm text-zinc-400">Settled positions render PositionRow with Claim + receipt link.</div></TabsContent>
      </Tabs>
    </div>
  );
}
