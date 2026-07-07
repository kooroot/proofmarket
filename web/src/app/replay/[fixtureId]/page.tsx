"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  formatReplayTime,
  goalEventsFromTimeline,
  useReplayClock,
} from "@/hooks/useReplayClock";
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
  const { clockMs, frame, done } = useReplayClock(timeline, finalMs);
  const bundle = adaptProofBundle(replay.bundle);
  const epochDay = epochDayFromTs(bundle.ts);
  const demo = demoMarketCopy(REPLAY_MARKET, MAINNET_HISTORICAL_REPLAY_FIXTURE);
  const currentP1Goals = frame?.stats?.["1"] ?? 0;
  const currentP2Goals = frame?.stats?.["2"] ?? 0;
  const goalEvents = goalEventsFromTimeline(timeline, {
    homeStatKey: "1",
    awayStatKey: "2",
    homeLabel: "Argentina",
    awayLabel: "Cape Verde",
  });
  const visibleGoalEvents = goalEvents.filter((event) => event.clockMs <= clockMs);
  const latestGoal = visibleGoalEvents[visibleGoalEvents.length - 1];
  const nextGoal = goalEvents.find((event) => event.clockMs > clockMs);
  const replayClockLabel = formatReplayTime(clockMs);
  if (!done)
    return (
      <div className="pt-[34px]" style={{ animation: "fadeUp .4s both" }}>
        <Link href="/" className="lk border-0 font-mono text-[11.5px]">
          ← Index
        </Link>

        <div className="mb-2 mt-[18px] flex flex-wrap items-center gap-[9px]">
          <span className="rounded-[3px] border border-proof px-2 py-[3px] font-mono text-[11px] text-proof">
            {demo.marketIcon} {demo.marketType}
          </span>
          <span className="font-mono text-[11.5px] text-ink-2">{demo.fixtureTitle}</span>
        </div>

        <h1 className="mb-[6px] break-words font-display text-[clamp(1.9rem,3.4vw,2.7rem)] font-bold leading-[1.04] tracking-[-0.03em]">
          {demo.question}
        </h1>

        <div className="mb-[18px] flex items-center gap-2 font-mono text-[11px] text-ink-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-proof opacity-75" style={{ animation: "blink 1.4s infinite" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-proof" />
          </span>
          Mainnet historical fixture {replay.fixtureId} — 45-second compressed replay to FT…
        </div>

        <div className="mb-[22px] grid grid-cols-2 gap-[10px]">
          <div className="rounded-[3px] border border-proof bg-proof-soft px-3 py-[9px] text-[13px] font-medium text-proof">{demo.yesLabel}</div>
          <div className="rounded-[3px] border border-rule-2 px-3 py-[9px] text-[13px] font-medium text-ink-2">{demo.noLabel}</div>
        </div>

        {/* broadcast panel */}
        <div className="overflow-hidden rounded-[4px] border border-rule-2">
          <div className="grid sm:grid-cols-[1fr_1.2fr]">
            <div className="border-b border-rule p-5 sm:border-b-0 sm:border-r">
              <div className="mb-[9px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">Live score</div>
              <motion.div
                key={`${currentP1Goals}-${currentP2Goals}`}
                initial={{ opacity: 0.55, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.26 }}
                className="font-display text-[29px] font-bold leading-[1.1]"
              >
                Argentina {currentP1Goals} - {currentP2Goals} Cape Verde
              </motion.div>
              <AnimatePresence mode="popLayout">
                {latestGoal && (
                  <motion.div
                    key={latestGoal.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.22 }}
                    className="mt-3 inline-flex items-center gap-2 rounded-[3px] bg-proof px-2 py-1 font-mono text-[10.5px] font-semibold text-paper"
                  >
                    <span>GOAL</span>
                    <span>
                      {latestGoal.teamLabel} · {latestGoal.scoreLabel}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-3 font-mono text-[11px] text-proof">Replay clock {replayClockLabel}</div>
            </div>
            <div className="p-5">
              <div className="mb-[10px] flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">
                <span>Goal timeline</span>
                <span>
                  {visibleGoalEvents.length}/{goalEvents.length}
                </span>
              </div>
              <ol className="grid min-h-[12.5rem] content-start gap-2 text-[12px]">
                <AnimatePresence initial={false}>
                  {visibleGoalEvents.map((event) => {
                    const isLatest = event.id === latestGoal?.id;
                    return (
                      <motion.li
                        key={event.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.28 }}
                        className={`grid grid-cols-[3.25rem_1fr_2.9rem] items-center gap-2 rounded-[3px] border px-2 py-1.5 ${
                          isLatest
                            ? "border-proof bg-proof-soft text-ink shadow-[inset_3px_0_0_var(--true)]"
                            : "border-rule bg-panel text-ink"
                        }`}
                        style={isLatest ? { animation: "tick .45s both" } : undefined}
                      >
                        <span className="font-mono">{event.timeLabel}</span>
                        <span className="min-w-0">
                          <span
                            className={`mr-2 rounded-[2px] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ${
                              isLatest ? "bg-proof text-paper" : "border border-rule-2 text-ink-2"
                            }`}
                          >
                            GOAL
                          </span>
                          {event.teamLabel}
                        </span>
                        <span className="text-right font-mono font-semibold">{event.scoreLabel}</span>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {visibleGoalEvents.length === 0 && (
                  <li className="rounded-[3px] border border-dashed border-rule-2 px-3 py-8 text-center font-mono text-[11px] text-ink-2">
                    Awaiting first scoring update…
                  </li>
                )}
                {visibleGoalEvents.length > 0 && nextGoal && (
                  <li className="rounded-[3px] border border-dashed border-rule px-3 py-2 font-mono text-[10.5px] text-ink-2">
                    Tracking next scoring update…
                  </li>
                )}
              </ol>
            </div>
          </div>
          <div className="border-t border-rule p-5">
            <div className="mb-[6px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">Raw stat leaf</div>
            <div className="grid gap-1 font-mono text-[13px] font-semibold text-ink sm:grid-cols-2">
              <span>Argentina goals = {currentP1Goals}</span>
              <span>Cape Verde goals = {currentP2Goals}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 font-mono text-[11px] text-proof">devnet escrow pattern: same validate_stat gate, frozen mainnet data</div>
        <div className="mt-1 text-[12px] text-ink-2">the moment this hits FT, the stat becomes a Merkle leaf — watch it walk to the on-chain root</div>
      </div>
    );
  return (
    <div className="pt-[34px]" style={{ animation: "fadeUp .4s both" }}>
      <Link href="/" className="lk border-0 font-mono text-[11.5px]">
        ← Index
      </Link>
      <div className="mb-2 mt-[18px] flex flex-wrap items-center gap-[9px]">
        <span className="rounded-[3px] border border-proof px-2 py-[3px] font-mono text-[11px] text-proof">
          {demo.marketIcon} {demo.marketType}
        </span>
        <span className="font-mono text-[11.5px] text-ink-2">{demo.fixtureTitle}</span>
        <span className="font-mono text-[11.5px] text-ink-2">Mainnet historical fixture {replay.fixtureId}</span>
      </div>
      <h1 className="mb-1 font-display text-[clamp(1.9rem,3.4vw,2.7rem)] font-bold leading-[1.04] tracking-[-0.03em]">
        Resolution walk — Argentina 3-2 Cape Verde
      </h1>
      <p className="mb-[22px] max-w-[690px] text-[15px] leading-[1.6] text-ink-2">
        Two stat leaves from TxLINE mainnet historical data, folded hash-by-hash into the root TxODDS published
        on-chain. The devnet escrow pattern gates release on the same TRUE predicate.
      </p>
      <div className="grid gap-8 pb-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(16rem,1fr)] lg:gap-10">
        <ProofChain
          bundle={bundle}
          dailyRoot={replay.dailyRootPda}
          epochDay={epochDay}
          rootExists={true}
          validate={parseValidateStatResult(MAINNET_VALIDATE_LOGS, MAINNET_TXLINE_PROGRAM_ID)}
          resolveTx={replay.resolveTx ?? undefined}
          claimTxs={replay.claimTxs ?? []}
          dataNetwork="mainnet"
        />
        <aside>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">Proof vs vote</div>
          <UmaContrastCard />
        </aside>
      </div>
    </div>
  );
}
