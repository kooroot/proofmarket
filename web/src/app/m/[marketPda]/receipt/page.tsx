"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ProofChain } from "@/components/ProofChain";
import { UmaContrastCard } from "@/components/UmaContrastCard";
import { adaptProofBundle } from "@/lib/proof";
import { useResolveReceipt } from "@/hooks/useResolveReceipt";
import { dailyRootPda, epochDayFromTs } from "@/lib/market";
import { getConnection } from "@/lib/connection";
import goldenRaw from "../../../../../public/replay/18172280.json";
export default function Receipt() {
  const golden = goldenRaw; const bundle = adaptProofBundle(golden.bundle);
  const epochDay = epochDayFromTs(bundle.ts); const pda = dailyRootPda(epochDay);
  const exists = useQuery({ queryKey: ["rootExists", pda.toBase58()], queryFn: async () => !!(await getConnection().getAccountInfo(pda)) });
  const receipt = useResolveReceipt(golden.resolveTx ?? undefined);
  const validate = receipt.data?.validate ?? { predicateTrue: null, returnBase64: null, returnBool: null };
  if (!golden.resolved) return <div className="p-6 text-zinc-400">This market is still open. <Link className="text-emerald-400" href="/replay/18172280">See how resolution works → Replay</Link></div>;
  return (
    <div className="p-6 max-w-5xl mx-auto grid md:grid-cols-[2fr_1fr] gap-6">
      <div><h1 className="text-2xl font-bold mb-1">No vote. No dispute window. Just math.</h1>
        <ProofChain bundle={bundle} dailyRoot={pda.toBase58()} epochDay={epochDay} rootExists={!!exists.data} validate={validate} resolveTx={golden.resolveTx ?? undefined} claimTxs={golden.claimTxs ?? []} /></div>
      <UmaContrastCard />
    </div>
  );
}
