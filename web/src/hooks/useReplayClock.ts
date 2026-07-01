"use client";
import { useEffect } from "react";
import { useUiStore } from "@/store/ui";
export interface Frame { ts: number; stats: Record<string, number>; }
export function frameAt(timeline: Frame[], clockMs: number): Frame {
  let f = timeline[0];
  for (const x of timeline) { if (x.ts <= clockMs) f = x; else break; }
  return f;
}
export function useReplayClock(timeline: Frame[], finalMs: number) {
  const { replayClockMs, setReplayClockMs, setMode } = useUiStore();
  useEffect(() => {
    setMode("replay"); setReplayClockMs(0);
    const id = setInterval(() => setReplayClockMs(Math.min(finalMs, useUiStore.getState().replayClockMs + 4000)), 200);
    return () => clearInterval(id);
  }, [finalMs, setMode, setReplayClockMs]);
  return { clockMs: replayClockMs, frame: frameAt(timeline, replayClockMs), done: replayClockMs >= finalMs };
}
