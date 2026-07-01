import { test, expect } from "bun:test";
import { buildResolveCall } from "../src/keeper/resolve.ts";
import { readGolden, writeGolden, goldenPath } from "../src/keeper/cache.ts";
import { tmpdir } from "node:os";

const dir = `${tmpdir()}/pm-resolve-${Date.now()}`;
const path = goldenPath(dir, 18172280, 1068, 1);
writeGolden(path, {
  bundle: {
    ts: 1782788706633,
    statToProve: { key: 1, value: 1, period: 7 },
    eventStatRoot: [1],
    summary: { fixtureId: 18172280, updateStats: { updateCount: 50, minTimestamp: 1782788706633, maxTimestamp: 1782788999466 }, eventStatsSubTreeRoot: [2] },
    statProof: [{ hash: [3], isRightSibling: true }],
    subTreeProof: [{ hash: [4], isRightSibling: false }],
    mainTreeProof: [{ hash: [5], isRightSibling: false }],
  },
  epochDay: 20634, rootsPda: "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe",
  rootAccountBytesB64: "", capturedAt: 0,
});

test("resolve is called with 6 positional args in canonical order (ts,summary,fixtureProof,mainTreeProof,statA,statB)", () => {
  const calls: any = {};
  const fakeProgram: any = {
    methods: {
      resolve: (...args: any[]) => {
        calls.args = args;
        return { accounts: (a: any) => { calls.accounts = a; return { preInstructions: () => ({}) }; } };
      },
    },
  };
  buildResolveCall(fakeProgram, { goldenPath: path, marketId: 777n, resolver: { toBase58: () => "R" } as any });
  expect(calls.args.length).toBe(6);
  expect(calls.args[0].toString()).toBe("1782788706633"); // ts BN
  expect(calls.args[4].statToProve).toEqual({ key: 1, value: 1, period: 7 }); // statA
  expect(calls.args[5]).toBeNull(); // statB
  expect(Object.keys(calls.accounts).sort()).toEqual(
    ["dailyScoresMerkleRoots", "market", "resolver", "txoracleProgram"],
  );
});
