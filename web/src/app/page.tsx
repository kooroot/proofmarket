"use client";
import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { BookRow } from "@/components/BookRow";
import { MainnetFixturePreviewPanel } from "@/components/MainnetFixturePreview";
import { UmaContrastCard } from "@/components/UmaContrastCard";
import { PlayAsGuestButton } from "@/components/PlayAsGuestButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useMainnetFixturePreview } from "@/hooks/useMainnetFixturePreview";
import {
  demoFixtureForMarket,
  demoMarketCopy,
  isFeaturedDemoMarket,
} from "@/lib/demo-market";
import { formatUsdc } from "@/lib/parimutuel";
import { MAINNET_HISTORICAL_REPLAY_ROUTE } from "@/lib/replay-demo";

const SPECIMEN: { num: string; short: string; tag: string; proof?: boolean }[] = [
  { num: "01", short: "Stat leaf — Argentina goals = 3", tag: "LEAF" },
  { num: "02", short: "Event-stat root", tag: "NODE" },
  { num: "03", short: "Fixture sub-tree — 18175918", tag: "NODE" },
  { num: "04", short: "Daily root — on-chain anchor", tag: "ROOT" },
  { num: "05", short: "validate_stat re-walks → bool", tag: "TRUE", proof: true },
  { num: "06", short: "Escrow release — winners claim", tag: "PAID", proof: true },
];

export default function MarketList() {
  const { data, isLoading } = useMarkets();
  const mainnetPreview = useMainnetFixturePreview();
  const markets = data ?? [];
  const featuredMarkets = markets.filter(isFeaturedDemoMarket);
  const statProofMarkets = markets.filter((m) => !isFeaturedDemoMarket(m));

  return (
    <>
      {/* HERO */}
      <section
        className="grid grid-cols-1 border-b border-rule lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
        style={{ animation: "fadeUp .5s both" }}
      >
        <div className="border-rule py-[46px] pr-0 lg:border-r lg:pr-10 lg:pt-[52px]">
          <div className="flex gap-5">
            <div className="hidden select-none border-r border-rule pr-[14px] text-right font-mono text-[11px] leading-[2.05] text-ink-2 sm:block">
              01<br />02<br />03<br />04<br />05
            </div>
            <div>
              <div className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.14em] text-proof">
                Prediction markets · settled by proof
              </div>
              <h1 className="m-0 font-display text-[clamp(2.6rem,4.6vw,4.05rem)] font-bold leading-[1.0] tracking-[-0.04em]">
                No vote.
                <br />
                No dispute window.
                <br />
                <span className="text-proof">Just math.</span>
              </h1>
              <p className="mt-[22px] max-w-[440px] text-[16px] leading-[1.62] text-ink-2">
                World Cup markets resolve when the escrow calls{" "}
                <span className="font-mono text-ink">validate_stat</span> and reads a single bool. A
                forged proof doesn&apos;t get out-voted — it reverts.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-[11px]">
                <PlayAsGuestButton />
                <Link
                  href={MAINNET_HISTORICAL_REPLAY_ROUTE}
                  className="rounded-[3px] border border-rule-2 px-5 py-3 text-[14px] text-ink transition-colors hover:border-proof hover:text-proof"
                >
                  Replay demo
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* specimen receipt */}
        <div className="py-[26px] lg:pl-[34px]">
          <div className="mb-[14px] flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">Specimen receipt</span>
            <Link href={MAINNET_HISTORICAL_REPLAY_ROUTE} className="lk border-0 font-mono text-[11px]">
              18175918 →
            </Link>
          </div>
          <div className="mb-[3px] font-display text-[19px]">Argentina 3–2 Cape Verde</div>
          <div className="mb-[16px] text-[12.5px] text-ink-2">
            Will Argentina beat Cape Verde? <span className="font-semibold text-proof">→ TRUE</span>
          </div>
          {SPECIMEN.map((s) => (
            <div key={s.num} className="grid grid-cols-[22px_1fr_auto] items-center gap-[10px] border-t border-rule py-[7px]">
              <span className="font-mono text-[10px] text-ink-2">{s.num}</span>
              <span className="text-[12.5px]">{s.short}</span>
              <span
                className={`rounded-[3px] border px-[7px] py-[2px] font-mono text-[10.5px] ${
                  s.proof ? "border-proof bg-proof-soft text-proof" : "border-rule-2 text-ink-2"
                }`}
              >
                {s.tag}
              </span>
            </div>
          ))}
          <div className="mt-3 flex items-center gap-2 border-t-2 border-proof pt-[11px]">
            <span className="rounded-[3px] bg-proof px-2 py-[3px] font-mono text-[10px] font-semibold text-paper">
              validate_stat → TRUE
            </span>
            <span className="text-[12px] text-ink-2">escrow released by math</span>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="grid grid-cols-3 border-b border-rule">
        {[
          ["1,000", "faucet test-USDC"],
          ["1 tx", "settlement · no window"],
          ["0 SOL", "needed to judge"],
        ].map(([big, small], i) => (
          <div
            key={small}
            className={`py-5 ${i === 0 ? "border-r border-rule pr-6" : i === 1 ? "border-r border-rule px-6" : "pl-6"}`}
          >
            <div className="font-display text-[30px] tabular-nums">{big}</div>
            <div className="mt-[2px] font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">{small}</div>
          </div>
        ))}
      </section>

      {/* THE BOOK */}
      <section id="the-book" className="scroll-mt-24 pt-11">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="m-0 font-display text-[30px] font-bold tracking-[-0.025em]">The Book</h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">
            Devnet executable markets · parimutuel
          </span>
        </div>
        <div className="mt-3 h-[2px] bg-ink" />

        {/* column header */}
        <div className="hidden grid-cols-[minmax(0,1fr)_140px_66px_66px_92px_152px] gap-3 border-b border-rule px-3 py-[9px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 sm:grid">
          <span>Market</span>
          <span>Implied YES</span>
          <span className="text-right">YES ×</span>
          <span className="text-right">NO ×</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Resolve after</span>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !markets.length ? (
          <div className="px-3 py-6 text-[13.5px] text-ink-2">
            No live devnet markets.{" "}
            <Link className="lk" href={MAINNET_HISTORICAL_REPLAY_ROUTE}>
              Watch the resolution replay
            </Link>
          </div>
        ) : (
          featuredMarkets.map((m) => (
            <BookRow key={m.pda} m={m} demoFixture={demoFixtureForMarket(m, mainnetPreview.data?.fixtures)} />
          ))
        )}

        {/* stat-proof demos */}
        {statProofMarkets.length > 0 && (
          <>
            <div className="mt-[30px] flex items-baseline justify-between">
              <h3 className="m-0 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">Stat-proof demos</h3>
            </div>
            {statProofMarkets.map((m) => {
              const fixture = demoFixtureForMarket(m, mainnetPreview.data?.fixtures);
              const demo = demoMarketCopy(m, fixture);
              return (
                <Link
                  key={m.pda}
                  href={`/m/${m.pda}`}
                  className="flex items-center justify-between gap-[14px] border-b border-rule px-3 py-[13px] transition-colors hover:bg-panel-2"
                >
                  <div>
                    <div className="text-[14.5px] font-medium">{demo.question}</div>
                    <div className="mt-[3px] font-mono text-[10.5px] text-ink-2">
                      {demo.resolvePredicate} · fixture {demo.mainnetFixtureId}
                    </div>
                  </div>
                  <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-ink-2">
                    ${formatUsdc(m.yesPool + m.noPool)}
                  </span>
                </Link>
              );
            })}
          </>
        )}
      </section>

      {/* UPCOMING — mainnet preview */}
      <section className="pt-[46px]">
        <MainnetFixturePreviewPanel
          preview={mainnetPreview.data}
          isLoading={mainnetPreview.isLoading}
          isError={mainnetPreview.isError}
        />
      </section>

      {/* CONTRAST */}
      <section className="mt-[46px] border-t-2 border-ink pt-[34px]">
        <h2 className="mb-1 font-display text-[30px] font-bold tracking-[-0.025em]">Proof, not a vote</h2>
        <p className="mb-[22px] max-w-[640px] text-[14.5px] leading-[1.6] text-ink-2">
          An optimistic oracle can resolve any subjective question; ProofMarket resolves only predicates over the
          objective match stats TxLINE signs.
        </p>
        <UmaContrastCard />
      </section>
    </>
  );
}
