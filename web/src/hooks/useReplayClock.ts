"use client";
import { useEffect } from "react";
import { useUiStore } from "@/store/ui";
export interface Frame { ts: number; stats: Record<string, number>; }
export interface GoalEvent {
  id: string;
  clockMs: number;
  timeLabel: string;
  teamLabel: string;
  scoreLabel: string;
}
export interface GoalEventOptions {
  homeStatKey: string;
  awayStatKey: string;
  homeLabel: string;
  awayLabel: string;
}
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
export function formatReplayTime(clockMs: number): string {
  const totalSeconds = Math.max(0, Math.round(clockMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export function goalEventsFromTimeline(
  timeline: Frame[],
  options: GoalEventOptions
): GoalEvent[] {
  const events: GoalEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  for (const frame of timeline) {
    const nextHomeGoals = frame.stats[options.homeStatKey] ?? homeGoals;
    const nextAwayGoals = frame.stats[options.awayStatKey] ?? awayGoals;
    for (let goal = homeGoals + 1; goal <= nextHomeGoals; goal++) {
      events.push({
        id: `${options.homeStatKey}-${frame.ts}-${goal}`,
        clockMs: frame.ts,
        timeLabel: formatReplayTime(frame.ts),
        teamLabel: options.homeLabel,
        scoreLabel: `${goal}-${awayGoals}`,
      });
    }
    homeGoals = nextHomeGoals;
    for (let goal = awayGoals + 1; goal <= nextAwayGoals; goal++) {
      events.push({
        id: `${options.awayStatKey}-${frame.ts}-${goal}`,
        clockMs: frame.ts,
        timeLabel: formatReplayTime(frame.ts),
        teamLabel: options.awayLabel,
        scoreLabel: `${homeGoals}-${goal}`,
      });
    }
    awayGoals = nextAwayGoals;
  }
  return events;
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
