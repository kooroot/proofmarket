import { test, expect } from "bun:test";
import { tmpdir } from "node:os";
import { goldenPath, writeGolden, readGolden } from "../src/keeper/cache.ts";
import type { ProofBundle } from "../src/keeper/types.ts";

const bundle = { ts: 1782788706633, statToProve: { key: 1, value: 1, period: 7 } } as unknown as ProofBundle;

test("golden path is keyed on fixtureId-seq-statKey", () => {
  expect(goldenPath("/c", 18172280, 1068, 1)).toBe("/c/golden/18172280-1068-1.json");
});

test("writes then reads back an identical golden bundle (bundle + root bytes)", () => {
  const dir = `${tmpdir()}/pm-${Date.now()}`;
  const p = goldenPath(dir, 18172280, 1068, 1);
  const g = {
    bundle, epochDay: 20634,
    rootsPda: "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe",
    rootAccountBytesB64: Buffer.from([1, 2, 3]).toString("base64"),
    capturedAt: 1782789000000,
  };
  writeGolden(p, g);
  const back = readGolden(p);
  expect(back.epochDay).toBe(20634);
  expect(back.rootsPda).toBe("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
  expect(Buffer.from(back.rootAccountBytesB64, "base64")).toEqual(Buffer.from([1, 2, 3]));
  expect(back.bundle.ts).toBe(1782788706633);
});
