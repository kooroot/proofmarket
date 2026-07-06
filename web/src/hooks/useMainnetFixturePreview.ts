"use client";

import { useQuery } from "@tanstack/react-query";
import type { MainnetFixturePreview } from "@/lib/mainnet-preview";

export function useMainnetFixturePreview() {
  return useQuery<MainnetFixturePreview>({
    queryKey: ["txline-mainnet-fixtures-preview"],
    queryFn: async () => {
      const res = await fetch("/api/txline/fixtures/snapshot", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("mainnet fixture preview unavailable");
      return res.json();
    },
    staleTime: 60_000,
  });
}
