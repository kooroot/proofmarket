"use client";
import { useUiStore } from "@/store/ui";
export function resolveSource(mode: "live" | "replay") {
  return mode === "replay" ? { markets: "golden", scores: "golden", proof: "golden" } : { markets: "chain", scores: "proxy", proof: "proxy" } as const;
}
export function useMarketFeed() {
  const mode = useUiStore((s) => s.mode);
  return { mode, source: resolveSource(mode) };
}
