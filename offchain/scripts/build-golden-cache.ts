// Offline builder for the §3.7/G6 replay fixture: reshape the committed Phase-0 golden snapshot
// (proofmarket/golden/{bundle,daily-root-account}.json) into a GoldenBundle on disk. No network.
import { readFileSync } from "node:fs";
import { writeGolden, goldenPath, readGolden } from "../src/keeper/cache.ts";
import { epochDayFromTs } from "../src/keeper/epochDay.ts";
import type { ProofBundle } from "../src/keeper/types.ts";

const bundle = JSON.parse(
  readFileSync(new URL("../../golden/bundle.json", import.meta.url), "utf8"),
) as ProofBundle;
const rootAcct = JSON.parse(
  readFileSync(new URL("../../golden/daily-root-account.json", import.meta.url), "utf8"),
) as { pubkey: string; account: { data: [string, string]; space: number } };

const epochDay = epochDayFromTs(bundle.ts);
const golden = {
  bundle,
  epochDay,
  rootsPda: rootAcct.pubkey,
  rootAccountBytesB64: rootAcct.account.data[0],
  capturedAt: bundle.summary.updateStats.maxTimestamp, // deterministic (no Date.now in a committed artifact)
};

const out = goldenPath("./cache", bundle.summary.fixtureId, 1068, bundle.statToProve.key);
writeGolden(out, golden);

// Self-verify the GO criteria so a bad reshape fails loudly here, not downstream.
const back = readGolden(out);
const rootBytes = Buffer.from(back.rootAccountBytesB64, "base64").length;
const leafOk = back.bundle.statToProve.key === 1 && back.bundle.statToProve.value === 1 && back.bundle.statToProve.period === 7;
if (rootBytes < 9232) throw new Error(`root bytes ${rootBytes} < 9232`);
if (!leafOk) throw new Error(`unexpected leaf ${JSON.stringify(back.bundle.statToProve)}`);
console.log(`GOLDEN WROTE ${out} (epochDay ${epochDay}, root EXISTS ${rootBytes}B, leaf {1,1,7} OK)`);
