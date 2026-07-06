import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { MarketCard } from "./MarketCard";
import { WORLD_CUP_DEMO_FIXTURES } from "@/lib/demo-market";
import type { UiMarket } from "@/lib/market";

const market: UiMarket = {
  pda: "Market1111111111111111111111111111111111",
  marketId: 1n,
  fixtureId: 18172280n,
  statAKey: 1,
  statAPeriod: 7,
  statBKey: null,
  statBPeriod: null,
  op: null,
  threshold: 0,
  comparison: 0,
  yesPool: 110_000_000n,
  noPool: 90_000_000n,
  feeBps: 100,
  lockTs: 1785921119045n,
  state: 0,
  outcome: 0,
};

describe("MarketCard", () => {
  it("frames a devnet settlement market with World Cup fixture and YES/NO copy", () => {
    render(
      <MarketCard
        m={market}
        label=""
        pFair={null}
        demoFixture={WORLD_CUP_DEMO_FIXTURES[0]}
      />
    );

    expect(screen.getByText("USA vs Belgium")).toBeInTheDocument();
    expect(screen.getByText("Team Goals")).toBeInTheDocument();
    expect(screen.getByText("Will USA score at least once?")).toBeInTheDocument();
    expect(screen.getByText("YES: USA scores")).toBeInTheDocument();
    expect(screen.getByText("NO: USA does not score")).toBeInTheDocument();
    expect(screen.getByText(/TxLINE mainnet fixtureId 18193785/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolve predicate\s+P1 goals > 0/i)).toBeInTheDocument();
  });
});
