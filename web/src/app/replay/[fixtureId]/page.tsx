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
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-sm text-zinc-400">Replaying fixture {golden.fixtureId} — P1 goals: {frame?.stats?.["1"] ?? 0} (clock advancing to FT…)</div>
      </div>
    );
  return (
    <div className="p-6 max-w-5xl mx-auto grid md:grid-cols-[2fr_1fr] gap-6">
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
  );
}
