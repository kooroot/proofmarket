import { describe, it, expect } from "vitest";
import {
  DEFAULT_REPLAY_DURATION_MS,
  REPLAY_TICK_MS,
  frameAt,
  replayStepMs,
} from "./useReplayClock";
import type { Frame } from "./useReplayClock";
const timeline: Frame[] = [
  { ts: 0, stats: { "1": 0 } },
  { ts: 60000, stats: { "1": 0 } },
  { ts: 120000, stats: { "1": 1 } },
];
describe("frameAt", () => {
  it("returns the latest frame at or before the clock", () => {
    expect(frameAt(timeline, 90000).stats["1"]).toBe(0);
    expect(frameAt(timeline, 120000).stats["1"]).toBe(1);
  });
  it("clamps before the first frame", () => {
    expect(frameAt(timeline, -10).ts).toBe(0);
  });
  it("compresses a full match replay into a 30 to 60 second demo window", () => {
    const fullMatchMs = 9_304_971;
    const step = replayStepMs(fullMatchMs);
    const ticks = Math.ceil(fullMatchMs / step);

    expect(DEFAULT_REPLAY_DURATION_MS).toBe(45_000);
    expect(ticks * REPLAY_TICK_MS).toBeGreaterThanOrEqual(DEFAULT_REPLAY_DURATION_MS);
    expect(ticks * REPLAY_TICK_MS).toBeLessThanOrEqual(
      DEFAULT_REPLAY_DURATION_MS + REPLAY_TICK_MS
    );
    expect(ticks * REPLAY_TICK_MS).toBeGreaterThanOrEqual(30_000);
    expect(ticks * REPLAY_TICK_MS).toBeLessThanOrEqual(60_000);
  });
});
