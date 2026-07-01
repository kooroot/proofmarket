import { describe, it, expect } from "vitest";
import { frameAt } from "./useReplayClock";
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
});
