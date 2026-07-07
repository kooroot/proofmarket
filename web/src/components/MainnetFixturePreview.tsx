"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useMainnetFixturePreview } from "@/hooks/useMainnetFixturePreview";
import type { MainnetFixturePreview as MainnetFixturePreviewData } from "@/lib/mainnet-preview";
import { fixtureTitleWithFlags } from "@/lib/team-flags";

function formatKickoff(ms: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(ms));
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[3px] border border-rule px-[7px] py-[2px] font-mono text-[10px] text-ink-2">
      {children}
    </span>
  );
}

export function MainnetFixturePreviewPanel({
  preview,
  isLoading = false,
  isError = false,
}: {
  preview: MainnetFixturePreviewData | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const fixtures = preview?.fixtures ?? [];

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-proof">TxLINE mainnet data preview</p>
          <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">
            Upcoming World Cup markets from real TxLINE fixture data
          </h2>
          <p className="max-w-2xl text-[14px] leading-[1.6] text-ink-2">
            Mainnet preview data shows only upcoming World Cup fixtures ordered by kickoff. Historical matches are
            reserved for deterministic replay receipts, while executable escrow and staking stay on devnet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip>mainnet feed</Chip>
          <Chip>SL1 / SL12 free tiers</Chip>
          <span className="rounded-[3px] bg-proof px-[9px] py-[3px] font-mono text-[10px] font-semibold text-paper">
            {preview?.count ?? 0} upcoming fixtures
          </span>
        </div>
      </div>

      <div className="mt-3 h-[2px] bg-ink" />
      <div className="py-[9px] font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">
        Executable settlement stays on devnet
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError || !preview ? (
        <div className="border border-rule-2 p-4 text-[13px] text-ink-2">
          <div className="font-medium text-ink">Mainnet preview unavailable</div>
          <div>Devnet settlement markets remain usable while the server-side TxLINE mainnet token is refreshed.</div>
        </div>
      ) : (
        <div>
          {fixtures.map((fixture) => (
            <div
              key={fixture.fixtureId}
              className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-[14px] border-b border-rule px-3 py-[13px] transition-colors hover:bg-panel-2"
            >
              <div className="min-w-0">
                <div className="break-words text-[15px] font-medium leading-snug">{fixtureTitleWithFlags(fixture)}</div>
                <div className="mt-1 font-mono text-[10.5px] text-ink-2">
                  {fixture.competition} / TxLINE fixtureId {fixture.fixtureId}
                </div>
                <div className="mt-[6px] flex flex-wrap gap-[6px]">
                  {fixture.markets.map((market) => (
                    <Chip key={market}>{market}</Chip>
                  ))}
                </div>
              </div>
              <div className="text-right font-mono text-[11.5px] tabular-nums text-ink-2">{formatKickoff(fixture.startTimeMs)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function MainnetFixturePreview() {
  const { data, isLoading, isError } = useMainnetFixturePreview();
  return <MainnetFixturePreviewPanel preview={data} isLoading={isLoading} isError={isError} />;
}
