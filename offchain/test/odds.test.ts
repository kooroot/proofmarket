import { test, expect } from "bun:test";
import { decodeOdds } from "../src/ingestion/odds.ts";

const PAYLOAD = {
  FixtureId: 18172280, Bookmaker: "TxODDS", SuperOddsType: "1X2",
  InRunning: false, Ts: 1782788706633,
  PriceNames: ["Home", "Draw", "Away"],
  Prices: [1850, 3600, 4200],
  Pct: ["52.632", "27.778", "19.231"],
};

test("decodes index-paired outcomes (rawPrice scale UNVERIFIED, display-only)", () => {
  const d = decodeOdds(PAYLOAD);
  expect(d.fixtureId).toBe(18172280);
  expect(d.outcomes).toEqual([
    { name: "Home", rawPrice: 1850, pctDeVig: "52.632" },
    { name: "Draw", rawPrice: 3600, pctDeVig: "27.778" },
    { name: "Away", rawPrice: 4200, pctDeVig: "19.231" },
  ]);
});

test("tolerates missing price/pct arrays", () => {
  const d = decodeOdds({ FixtureId: 1, PriceNames: ["Yes"], Ts: 0 });
  expect(d.outcomes).toEqual([{ name: "Yes", rawPrice: null, pctDeVig: null }]);
});
