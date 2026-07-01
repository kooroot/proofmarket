import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const WS = join(HERE, ".."); // proofmarket/

const src = JSON.parse(readFileSync(join(WS, "golden/bundle.json"), "utf8"));
const args = JSON.parse(readFileSync(join(WS, "golden/validate-stat-args.json"), "utf8"));
const web = JSON.parse(readFileSync(join(WS, "web/public/replay/18172280.json"), "utf8")).bundle;
const cap = JSON.parse(readFileSync(join(WS, "tests/fixtures/resolved-market.json"), "utf8"));

test("frontend replay bundle is byte-identical to the golden source", () => {
  // The whole ProofBundle the receipt UI renders equals the single source.
  expect(web).toEqual(src);
});

test("validate-stat-args (chain resolve consumer) carries the same leaf + roots", () => {
  expect(args.statA.statToProve).toEqual(src.statToProve); // leaf {key,value,period}
  expect(args.statA.eventStatRoot).toEqual(src.eventStatRoot); // stat-term root
  expect(args.fixtureSummary.eventsSubTreeRoot).toEqual(src.summary.eventStatsSubTreeRoot); // fixture sub-tree root
});

test("the on-chain resolved capture recorded the golden source roots (end-to-end)", () => {
  expect(cap.eventStatRoot).toEqual(src.eventStatRoot);
  expect(cap.eventsSubTreeRoot).toEqual(src.summary.eventStatsSubTreeRoot);
  expect(cap.dailyRoot).toBe("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
});
