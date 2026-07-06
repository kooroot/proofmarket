import type { MainnetFixturePreviewItem } from "./mainnet-preview";
import { predicateToText } from "./predicate";
import type { UiMarket } from "./market";
import { fixtureTitleWithFlags } from "./team-flags";

export const WORLD_CUP_DEMO_FIXTURES: MainnetFixturePreviewItem[] = [
  {
    fixtureId: 18193785,
    participant1: "USA",
    participant2: "Belgium",
    competition: "World Cup",
    startTimeMs: 1783382400000,
    markets: [
      "Match Winner",
      "Over / Under Goals",
      "Team Goals",
      "Corners Micro Market",
    ],
  },
  {
    fixtureId: 18198205,
    participant1: "Portugal",
    participant2: "Spain",
    competition: "World Cup",
    startTimeMs: 1783364400000,
    markets: [
      "Match Winner",
      "Over / Under Goals",
      "Team Goals",
      "Corners Micro Market",
    ],
  },
  {
    fixtureId: 18202701,
    participant1: "Argentina",
    participant2: "Egypt",
    competition: "World Cup",
    startTimeMs: 1783440000000,
    markets: [
      "Match Winner",
      "Over / Under Goals",
      "Team Goals",
      "Corners Micro Market",
    ],
  },
  {
    fixtureId: 18202783,
    participant1: "Switzerland",
    participant2: "Colombia",
    competition: "World Cup",
    startTimeMs: 1783454400000,
    markets: [
      "Match Winner",
      "Over / Under Goals",
      "Team Goals",
      "Corners Micro Market",
    ],
  },
];

export interface DemoMarketCopy {
  fixtureTitle: string;
  marketIcon: string;
  marketType: string;
  question: string;
  yesLabel: string;
  noLabel: string;
  resolvePredicate: string;
  mainnetFixtureId: number;
  featured: boolean;
}

const MARKET_ID_FIXTURE_INDEX: Record<string, number> = {
  "1": 0,
  "5": 1,
  "6": 2,
  "7": 3,
};

function participantForStatKey(market: UiMarket, fixture: MainnetFixturePreviewItem): string {
  return market.statAKey % 2 === 0 ? fixture.participant2 : fixture.participant1;
}

function hasSecondStat(market: UiMarket): boolean {
  return market.statBKey !== null && market.statBKey !== 0;
}

export function isFeaturedDemoMarket(market: UiMarket): boolean {
  if (market.statAKey === 7 || market.statAKey === 8) return false;
  if (hasSecondStat(market) && market.statAKey === 7 && market.statBKey === 8) return false;
  return market.statAKey === 1 || market.statAKey === 2;
}

export function demoFixtureForMarket(
  market: UiMarket,
  fixtures: MainnetFixturePreviewItem[] | null | undefined = WORLD_CUP_DEMO_FIXTURES
): MainnetFixturePreviewItem {
  const catalog = fixtures?.length ? fixtures : WORLD_CUP_DEMO_FIXTURES;
  const mappedIndex = MARKET_ID_FIXTURE_INDEX[market.marketId.toString()];
  const index = mappedIndex ?? Number(market.marketId % BigInt(catalog.length));
  return catalog[index % catalog.length] ?? WORLD_CUP_DEMO_FIXTURES[0];
}

export function demoMarketCopy(
  market: UiMarket,
  fixture = demoFixtureForMarket(market)
): DemoMarketCopy {
  const fixtureTitle = fixtureTitleWithFlags(fixture);
  const resolvePredicate = predicateToText({
    label: "",
    statAKey: market.statAKey,
    statBKey: market.statBKey,
    op: market.op,
    comparison: market.comparison,
    threshold: market.threshold,
  });

  if (
    hasSecondStat(market) &&
    market.statAKey === 1 &&
    market.statBKey === 2 &&
    market.op === 1 &&
    market.comparison === 0
  ) {
    return {
      fixtureTitle,
      marketIcon: "🏁",
      marketType: "Match Winner",
      question: `Will ${fixture.participant1} beat ${fixture.participant2}?`,
      yesLabel: `YES: ${fixture.participant1} wins`,
      noLabel: `NO: ${fixture.participant1} does not win`,
      resolvePredicate,
      mainnetFixtureId: fixture.fixtureId,
      featured: true,
    };
  }

  if (
    hasSecondStat(market) &&
    market.statAKey === 7 &&
    market.statBKey === 8 &&
    market.op === 1
  ) {
    return {
      fixtureTitle,
      marketIcon: "🔎",
      marketType: "Stat Proof Demo",
      question: `Can TxLINE prove ${fixture.participant1}'s corner count?`,
      yesLabel: "YES: stat proof available",
      noLabel: "NO: predicate false",
      resolvePredicate,
      mainnetFixtureId: fixture.fixtureId,
      featured: false,
    };
  }

  if (market.statAKey === 7 || market.statAKey === 8) {
    const team = participantForStatKey(market, fixture);
    return {
      fixtureTitle,
      marketIcon: "🔎",
      marketType: "Stat Proof Demo",
      question: `Can TxLINE prove ${team}'s corner stat?`,
      yesLabel: "YES: stat proof available",
      noLabel: "NO: predicate false",
      resolvePredicate,
      mainnetFixtureId: fixture.fixtureId,
      featured: false,
    };
  }

  if (market.statAKey === 1 || market.statAKey === 2) {
    const team = participantForStatKey(market, fixture);
    return {
      fixtureTitle,
      marketIcon: "⚽",
      marketType: "Team Goals",
      question: `Will ${team} score at least once?`,
      yesLabel: `YES: ${team} scores`,
      noLabel: `NO: ${team} does not score`,
      resolvePredicate,
      mainnetFixtureId: fixture.fixtureId,
      featured: true,
    };
  }

  return {
    fixtureTitle,
    marketIcon: "🔎",
    marketType: "Football Stat Market",
    question: `${fixtureTitle}: will the predicate resolve YES?`,
    yesLabel: "YES: predicate true",
    noLabel: "NO: predicate false",
    resolvePredicate,
    mainnetFixtureId: fixture.fixtureId,
    featured: false,
  };
}
