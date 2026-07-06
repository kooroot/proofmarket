import type { MainnetFixturePreviewItem } from "./mainnet-preview";

export const MAINNET_HISTORICAL_REPLAY_FIXTURE: MainnetFixturePreviewItem = {
  fixtureId: 18175918,
  participant1: "Argentina",
  participant2: "Cape Verde",
  competition: "World Cup",
  startTimeMs: 1783116000000,
  markets: [
    "Match Winner",
    "Over / Under Goals",
    "Team Goals",
    "Stat Proof Receipt",
  ],
};

export const MAINNET_HISTORICAL_REPLAY_ROUTE = "/replay/18175918";
export const MAINNET_TXLINE_PROGRAM_ID =
  "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA";
