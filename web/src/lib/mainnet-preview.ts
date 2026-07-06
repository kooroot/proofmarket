export interface TxlineFixtureLike {
  FixtureId?: unknown;
  fixtureId?: unknown;
  Participant1?: unknown;
  participant1?: unknown;
  Participant2?: unknown;
  participant2?: unknown;
  Competition?: unknown;
  competition?: unknown;
  StartTime?: unknown;
  startTime?: unknown;
}

export interface MainnetFixturePreviewItem {
  fixtureId: number;
  participant1: string;
  participant2: string;
  competition: string;
  startTimeMs: number;
  markets: string[];
}

export interface MainnetFixturePreview {
  network: "mainnet";
  source: "TxLINE World Cup Free Tier";
  count: number;
  fixtures: MainnetFixturePreviewItem[];
  freeTiers: Array<{ serviceLevel: number; latency: string }>;
}

const PREVIEW_MARKETS = [
  "Match Winner",
  "Over / Under Goals",
  "Team Goals",
  "Stat Proof Receipt",
];

const FREE_TIERS = [
  { serviceLevel: 1, latency: "60-second delay" },
  { serviceLevel: 12, latency: "real-time" },
];

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeFixture(
  fixture: TxlineFixtureLike
): MainnetFixturePreviewItem | null {
  const fixtureId = asNumber(fixture.FixtureId ?? fixture.fixtureId);
  const startTimeMs = asNumber(fixture.StartTime ?? fixture.startTime);
  if (fixtureId === null || startTimeMs === null) return null;

  return {
    fixtureId,
    participant1: asText(
      fixture.Participant1 ?? fixture.participant1,
      "Participant 1"
    ),
    participant2: asText(
      fixture.Participant2 ?? fixture.participant2,
      "Participant 2"
    ),
    competition: asText(fixture.Competition ?? fixture.competition, "Football"),
    startTimeMs,
    markets: PREVIEW_MARKETS,
  };
}

function isWorldCupFixture(fixture: MainnetFixturePreviewItem): boolean {
  return fixture.competition.trim().toLowerCase() === "world cup";
}

function isUpcomingFixture(
  fixture: MainnetFixturePreviewItem,
  nowMs: number
): boolean {
  return fixture.startTimeMs >= nowMs;
}

export function buildMainnetFixturePreview(
  fixtures: TxlineFixtureLike[],
  limit = 8,
  nowMs = Date.now()
): MainnetFixturePreview {
  const normalized = fixtures
    .map(normalizeFixture)
    .filter((fixture): fixture is MainnetFixturePreviewItem => fixture !== null)
    .filter(isWorldCupFixture)
    .filter((fixture) => isUpcomingFixture(fixture, nowMs))
    .sort((a, b) => {
      return a.startTimeMs - b.startTimeMs;
    });

  const previewFixtures = normalized
    .slice(0, limit);

  return {
    network: "mainnet",
    source: "TxLINE World Cup Free Tier",
    count: normalized.length,
    fixtures: previewFixtures,
    freeTiers: FREE_TIERS,
  };
}
