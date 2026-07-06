"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            TxLINE mainnet data preview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            World Cup-only football markets from real TxLINE fixture data
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-500">
            Mainnet data is filtered to World Cup fixtures and ordered around
            the closest kickoff. The executable escrow, staking, receipt, and
            validate_stat settlement demo stays on devnet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">mainnet feed</Badge>
          <Badge variant="outline">SL1 / SL12 free tiers</Badge>
          <Badge className="bg-emerald-600">
            {preview?.count ?? 0} World Cup fixtures
          </Badge>
        </div>
      </div>

      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Executable settlement stays on devnet
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError || !preview ? (
        <Card className="p-4 text-sm text-zinc-500">
          <div className="font-medium text-zinc-900">
            Mainnet preview unavailable
          </div>
          <div>
            Devnet settlement markets remain usable while the server-side
            TxLINE mainnet token is refreshed.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {fixtures.map((fixture) => (
            <Card key={fixture.fixtureId} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words font-medium leading-snug">
                    {fixtureTitleWithFlags(fixture)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {fixture.competition} / TxLINE fixtureId{" "}
                    {fixture.fixtureId}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {formatKickoff(fixture.startTimeMs)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {fixture.markets.map((market) => (
                  <Badge key={market} variant="secondary">
                    {market}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function MainnetFixturePreview() {
  const { data, isLoading, isError } = useMainnetFixturePreview();
  return (
    <MainnetFixturePreviewPanel
      preview={data}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
