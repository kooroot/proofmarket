"use client";
import { useEffect } from "react";
import { useUiStore } from "@/store/ui";
export interface Frame { ts: number; stats: Record<string, number>; }
export const REPLAY_TICK_MS = 200;
export const DEFAULT_REPLAY_DURATION_MS = 45_000;
export function frameAt(timeline: Frame[], clockMs: number): Frame {
  let f = timeline[0];
  for (const x of timeline) { if (x.ts <= clockMs) f = x; else break; }
  return f;
}
export function replayStepMs(
  finalMs: number,
  targetDurationMs = DEFAULT_REPLAY_DURATION_MS
): number {
  if (finalMs <= 0) return 0;
  const ticks = Math.max(1, Math.ceil(targetDurationMs / REPLAY_TICK_MS));
  return Math.max(1, Math.ceil(finalMs / ticks));
}
export function useReplayClock(timeline: Frame[], finalMs: number) {
  const { replayClockMs, setReplayClockMs, setMode } = useUiStore();
  useEffect(() => {
    setMode("replay"); setReplayClockMs(0);
    const stepMs = replayStepMs(finalMs);
    const id = setInterval(() => setReplayClockMs(Math.min(finalMs, useUiStore.getState().replayClockMs + stepMs)), REPLAY_TICK_MS);
    return () => clearInterval(id);
  }, [finalMs, setMode, setReplayClockMs]);
  return { clockMs: replayClockMs, frame: frameAt(timeline, replayClockMs), done: replayClockMs >= finalMs };
}
