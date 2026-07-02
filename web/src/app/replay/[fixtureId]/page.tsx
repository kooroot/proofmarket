"use client";
import { useReplayClock } from "@/hooks/useReplayClock";
import { ProofChain } from "@/components/ProofChain";
import { UmaContrastCard } from "@/components/UmaContrastCard";
import { adaptProofBundle } from "@/lib/proof";
import { epochDayFromTs } from "@/lib/market";
import { parseValidateStatResult } from "@/lib/validate-result";
import golden from "../../../../public/replay/18172280.json";
const DEFAULT_LOGS = [
  "Program log: Predicate evaluated to: true",
  "Program return: 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J AQ==",
];
export default function Replay() {
  const t0 = golden.scoresTimeline.length ? golden.scoresTimeline[0].ts : 0;
  const timeline = golden.scoresTimeline.map((f) => ({ ts: f.ts - t0, stats: f.stats as Record<string, number> }));
  const finalMs = timeline.length ? timeline[timeline.length - 1].ts : 0;
  const { frame, done } = useReplayClock(timeline, finalMs);
  const bundle = adaptProofBundle(golden.bundle);
  const epochDay = epochDayFromTs(bundle.ts);
  if (!done)
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-zinc-950 text-zinc-100 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Replaying fixture {golden.fixtureId} — clock advancing to FT…
          </div>
          <div className="text-4xl font-bold tabular-nums">P1 goals&nbsp;&nbsp;{frame?.stats?.["1"] ?? 0}</div>
          <div className="text-xs text-zinc-500">the moment this hits FT, the stat becomes a Merkle leaf — watch it walk to the on-chain root</div>
        </div>
      </div>
    );
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="rounded-2xl bg-zinc-950 text-zinc-100 p-4 sm:p-6">
        <h1 className="text-xl font-bold">Resolution walk — fixture {golden.fixtureId}</h1>
        <p className="text-sm text-zinc-400 mb-5">One stat, folded hash-by-hash into the root TxODDS already published on-chain. Follow the chips.</p>
        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <ProofChain
            bundle={bundle}
            dailyRoot={golden.dailyRootPda}
            epochDay={epochDay}
            rootExists={true}
            validate={parseValidateStatResult(DEFAULT_LOGS)}
            resolveTx={golden.resolveTx ?? undefined}
            claimTxs={golden.claimTxs ?? []}
          />
          <UmaContrastCard />
        </div>
      </div>
    </div>
  );
}
