import { describe, it, expect } from "vitest";
import {
  DEFAULT_REPLAY_DURATION_MS,
  REPLAY_TICK_MS,
  frameAt,
  formatReplayTime,
  goalEventsFromTimeline,
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
  it("extracts goal events and replay clock labels from score changes", () => {
    const matchTimeline: Frame[] = [
      { ts: 0, stats: { "1": 0, "2": 0 } },
      { ts: 830606, stats: { "1": 1, "2": 0 } },
      { ts: 3897195, stats: { "1": 1, "2": 1 } },
      { ts: 6720282, stats: { "1": 2, "2": 1 } },
      { ts: 7365411, stats: { "1": 2, "2": 2 } },
      { ts: 8202437, stats: { "1": 3, "2": 2 } },
    ];

    expect(formatReplayTime(830606)).toBe("13:51");
    expect(
      goalEventsFromTimeline(matchTimeline, {
        homeStatKey: "1",
        awayStatKey: "2",
        homeLabel: "Argentina",
        awayLabel: "Cape Verde",
      })
    ).toEqual([
      {
        id: "1-830606-1",
        clockMs: 830606,
        timeLabel: "13:51",
        teamLabel: "Argentina",
        scoreLabel: "1-0",
      },
      {
        id: "2-3897195-1",
        clockMs: 3897195,
        timeLabel: "64:57",
        teamLabel: "Cape Verde",
        scoreLabel: "1-1",
      },
      {
        id: "1-6720282-2",
        clockMs: 6720282,
        timeLabel: "112:00",
        teamLabel: "Argentina",
        scoreLabel: "2-1",
      },
      {
        id: "2-7365411-2",
        clockMs: 7365411,
        timeLabel: "122:45",
        teamLabel: "Cape Verde",
        scoreLabel: "2-2",
      },
      {
        id: "1-8202437-3",
        clockMs: 8202437,
        timeLabel: "136:42",
        teamLabel: "Argentina",
        scoreLabel: "3-2",
      },
    ]);
  });
});
