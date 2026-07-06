import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketDetail from "./page";

vi.mock("@/hooks/useMarkets", () => ({
  useMarkets: () => ({
    data: [{
      pda: "Market1111111111111111111111111111111111",
      marketId: 7n,
      fixtureId: 18172280n,
      statAKey: 1,
      statAPeriod: 7,
      statBKey: 2,
      statBPeriod: 7,
      op: 1,
      threshold: 0,
      comparison: 0,
      yesPool: 2_000_000n,
      noPool: 1_000_000n,
      feeBps: 100,
      lockTs: 1782788706633n,
      state: 0,
      outcome: 0,
    }],
  }),
}));

vi.mock("@/hooks/usePosition", () => ({
  usePosition: () => ({ data: null }),
}));

vi.mock("@/components/StakePanel", () => ({
  StakePanel: () => <div data-testid="stake-panel" />,
}));

describe("Market detail hero", () => {
  it("surfaces the settlement metadata judges need on the hero screen", () => {
    render(<MarketDetail params={{ marketPda: "Market1111111111111111111111111111111111" }} />);

    expect(screen.getByRole("heading", { name: /P1 goals - P2 goals > 0/i })).toBeInTheDocument();
    expect(screen.getByText(/YES pool/i)).toBeInTheDocument();
    expect(screen.getByText(/NO pool/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolve predicate/i)).toBeInTheDocument();
    expect(screen.getByText(/TxLINE fixtureId/i)).toBeInTheDocument();
    expect(screen.getByText(/18172280/)).toBeInTheDocument();
    expect(screen.getByText(/statKey/i)).toBeInTheDocument();
    expect(screen.getByText(/1 - 2/)).toBeInTheDocument();
    expect(screen.getByText(/resolveAfter/i)).toBeInTheDocument();
    expect(screen.queryByText(/T\d{2}:\d{2}:\d{2}\.\d{3}Z/)).not.toBeInTheDocument();
    expect(screen.getByText(/Jun 30, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/\bUTC\b/)).toBeInTheDocument();
    expect(screen.getByText(/Proof status/i)).toBeInTheDocument();
  });
});
