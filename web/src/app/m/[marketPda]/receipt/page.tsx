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
const STANDALONE_VALIDATE_TX =
  "https://explorer.solana.com/tx/3PwENbNmQBESsnzYWrrcEwGvqfug4ZWmHZeMr7PBRJxtoGUNbyoPPiG6VeDjxGGCA2ZQmNNpUysx2mLiYUMypTMy?cluster=devnet";

export default function Receipt({ params }: { params: { marketPda: string } }) {
  const golden = goldenRaw; const bundle = adaptProofBundle(golden.bundle);
  const epochDay = epochDayFromTs(bundle.ts); const pda = dailyRootPda(epochDay);
  const exists = useQuery({ queryKey: ["rootExists", pda.toBase58()], queryFn: async () => !!(await getConnection().getAccountInfo(pda)) });
  const receipt = useResolveReceipt(golden.resolveTx ?? undefined);
  const validate = receipt.data?.validate ?? { predicateTrue: null, returnBase64: null, returnBool: null };
  if (!golden.resolved) return <div className="p-6 text-zinc-400">This market is still open. <Link className="text-emerald-400" href="/replay/18172280">See how resolution works → Replay</Link></div>;
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="rounded-2xl bg-zinc-950 text-zinc-100 p-4 sm:p-6">
        <h1 className="text-2xl font-bold">No vote. No dispute window. Just math.</h1>
        <p className="text-sm text-zinc-400">The Proof Receipt for the frozen TxLINE fixture, replayed hash by hash.</p>
        <div className="my-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <div className="font-medium">Live devnet markets stay open until a fresh post-lock proof exists.</div>
          <p className="mt-1 text-amber-100/80">
            The historical golden proof cannot satisfy a future finality guard, so market {params.marketPda.slice(0, 8)}... links to this deterministic replay receipt. The same proof also landed as a real
            {" "}
            <a className="text-emerald-300 underline underline-offset-2" href={STANDALONE_VALIDATE_TX} target="_blank" rel="noreferrer">
              standalone validate_stat tx
            </a>
            {" "}against the TxLINE devnet program.
          </p>
          <Link className="mt-2 inline-block text-emerald-300" href="/replay/18172280">Replay the fixture clock →</Link>
        </div>
        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <ProofChain bundle={bundle} dailyRoot={pda.toBase58()} epochDay={epochDay} rootExists={!!exists.data} validate={validate} resolveTx={golden.resolveTx ?? undefined} claimTxs={golden.claimTxs ?? []} />
          <UmaContrastCard />
        </div>
      </div>
    </div>
  );
}
