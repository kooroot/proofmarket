import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ProofBundle } from "./types.ts";

/** A self-contained replay artifact: bundle JSON + the permanent root-account bytes (§3.7 / P0-g). */
export interface GoldenBundle {
  bundle: ProofBundle;
  epochDay: number;
  rootsPda: string;            // base58
  rootAccountBytesB64: string; // getAccountInfo(rootsPda).data, base64
  capturedAt: number;          // ms
}

/** Maps a market to its cached final seq/statKey for one-shot replay (§3.5 INPUT). */
export interface ReplayDefinition {
  marketId: string;            // u64 as decimal string
  fixtureId: number;
  finalSeq: number;
  statKey: number;
}

export function goldenPath(dir: string, fixtureId: number, seq: number, statKey: number): string {
  return `${dir}/golden/${fixtureId}-${seq}-${statKey}.json`;
}

export function writeGolden(path: string, g: GoldenBundle): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(g, null, 2));
}

export function readGolden(path: string): GoldenBundle {
  return JSON.parse(readFileSync(path, "utf8")) as GoldenBundle;
}
