import { loadFixtures } from "../src/catalog/fixtures.ts";
import { buildCatalogForFixture } from "../src/catalog/generate.ts";
import { readGolden, goldenPath } from "../src/keeper/cache.ts";
import { buildResolveArgs } from "../src/keeper/resolveArgs.ts";
import { epochDayFromTs, dailyScoresRootsPda } from "../src/keeper/epochDay.ts";
import { buildReceipt } from "../src/keeper/receipt.ts";

const fx = loadFixtures().find((f) => f.FixtureId === 18172280)!;
const market = buildCatalogForFixture(fx).find((m) => m.templateId === "p1_to_score")!;
const golden = readGolden(goldenPath("./cache", 18172280, 1068, 1));

const args = buildResolveArgs(golden.bundle);
const epochDay = epochDayFromTs(golden.bundle.ts);
const rootsPda = dailyScoresRootsPda(epochDay).toBase58();
const outcome = golden.bundle.statToProve.value > market.predicates[0].threshold ? "YES" : "NO";

const receipt = buildReceipt({
  marketId: market.marketId.toString(), fixtureId: fx.FixtureId, combinator: "single",
  subBundles: [{ bundle: golden.bundle, dailyRootPda: rootsPda, dailyRootOnChain: [], validateStatReturn: outcome === "YES" ? "AQ==" : "AA==" }],
  outcome, resolveTxSig: "DRYRUN", finalWhistleTs: golden.bundle.ts, ts: golden.bundle.ts,
});

console.log("MARKET", market.title, "->", market.marketId.toString());
console.log("epochDay", epochDay, "rootsPda", rootsPda, "rootsMatch", rootsPda === golden.rootsPda);
console.log("resolve ts", args.ts.toString(), "statA.period", args.statA.statToProve.period, "statB", args.statB);
console.log("RECEIPT", JSON.stringify(receipt, null, 2));
