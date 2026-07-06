"use client";
import { useReplayClock } from "@/hooks/useReplayClock";
import { ProofChain } from "@/components/ProofChain";
import { UmaContrastCard } from "@/components/UmaContrastCard";
import { adaptProofBundle } from "@/lib/proof";
import { epochDayFromTs, type UiMarket } from "@/lib/market";
import { parseValidateStatResult } from "@/lib/validate-result";
import { demoMarketCopy } from "@/lib/demo-market";
import {
  MAINNET_HISTORICAL_REPLAY_FIXTURE,
  MAINNET_TXLINE_PROGRAM_ID,
} from "@/lib/replay-demo";
import replay from "../../../../public/replay/18175918.json";
const MAINNET_VALIDATE_LOGS = [
  "Program log: Predicate evaluated to: true",
  `Program return: ${MAINNET_TXLINE_PROGRAM_ID} AQ==`,
];
const replayLockTs =
  replay.scoresTimeline.length > 0
    ? BigInt(replay.scoresTimeline[replay.scoresTimeline.length - 1].ts)
    : 0n;
const REPLAY_MARKET: UiMarket = {
  pda: "ReplayDemoMarket11111111111111111111111111",
  marketId: 1n,
  fixtureId: BigInt(replay.fixtureId),
  statAKey: 1,
  statAPeriod: 100,
  statBKey: 2,
  statBPeriod: 100,
  op: 1,
  threshold: 0,
  comparison: 0,
  yesPool: 110_000_000n,
  noPool: 90_000_000n,
  feeBps: 100,
  lockTs: replayLockTs,
  state: 2,
  outcome: 1,
};
export default function Replay() {
  const t0 = replay.scoresTimeline.length ? replay.scoresTimeline[0].ts : 0;
  const timeline = replay.scoresTimeline.map((f) => ({ ts: f.ts - t0, stats: f.stats as Record<string, number> }));
  const finalMs = timeline.length ? timeline[timeline.length - 1].ts : 0;
  const { frame, done } = useReplayClock(timeline, finalMs);
  const bundle = adaptProofBundle(replay.bundle);
  const epochDay = epochDayFromTs(bundle.ts);
  const demo = demoMarketCopy(REPLAY_MARKET, MAINNET_HISTORICAL_REPLAY_FIXTURE);
  const currentP1Goals = frame?.stats?.["1"] ?? 0;
  const currentP2Goals = frame?.stats?.["2"] ?? 0;
  if (!done)
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-zinc-950 text-zinc-100 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Mainnet historical fixture {replay.fixtureId} — 90-second compressed replay to FT…
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-zinc-100">
              {demo.marketIcon} {demo.marketType}
            </span>
            <span>{demo.fixtureTitle}</span>
          </div>
          <h1 className="break-words text-2xl font-bold leading-tight">{demo.question}</h1>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-300">
              {demo.yesLabel}
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-medium text-zinc-300">
              {demo.noLabel}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Raw stat leaf
            </div>
            <div className="grid gap-1 font-mono text-sm font-semibold text-zinc-100 sm:grid-cols-2">
              <span>Argentina goals = {currentP1Goals}</span>
              <span>Cape Verde goals = {currentP2Goals}</span>
            </div>
          </div>
          <div className="text-xs text-emerald-300">devnet escrow pattern: same validate_stat gate, frozen mainnet data</div>
          <div className="text-xs text-zinc-500">the moment this hits FT, the stat becomes a Merkle leaf — watch it walk to the on-chain root</div>
        </div>
      </div>
    );
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="rounded-2xl bg-zinc-950 text-zinc-100 p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-zinc-100">
            {demo.marketIcon} {demo.marketType}
          </span>
          <span>{demo.fixtureTitle}</span>
          <span>Mainnet historical fixture {replay.fixtureId}</span>
        </div>
        <h1 className="text-xl font-bold">Resolution walk — Argentina 3-2 Cape Verde</h1>
        <p className="text-sm text-zinc-400 mb-5">Two stat leaves from TxLINE mainnet historical data, folded hash-by-hash into the root TxODDS published on-chain. The devnet escrow pattern gates release on the same TRUE predicate.</p>
        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <ProofChain
            bundle={bundle}
            dailyRoot={replay.dailyRootPda}
            epochDay={epochDay}
            rootExists={true}
            validate={parseValidateStatResult(
              MAINNET_VALIDATE_LOGS,
              MAINNET_TXLINE_PROGRAM_ID
            )}
            resolveTx={replay.resolveTx ?? undefined}
            claimTxs={replay.claimTxs ?? []}
            dataNetwork="mainnet"
          />
          <UmaContrastCard />
        </div>
      </div>
    </div>
  );
}
