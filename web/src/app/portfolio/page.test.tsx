import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Portfolio from "./page";
import { OUTCOME, STATE, type UiMarket } from "@/lib/market";

const walletState = vi.hoisted(() => ({
  publicKey: null as null | { toBase58: () => string },
}));
const mockUseMarkets = vi.fn();
const mockUsePortfolioPositions = vi.fn();

vi.mock("@/hooks/useMarkets", () => ({
  useMarkets: () => mockUseMarkets(),
}));

vi.mock("@/hooks/usePortfolioPositions", () => ({
  usePortfolioPositions: (markets: UiMarket[]) => mockUsePortfolioPositions(markets),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ publicKey: walletState.publicKey }),
  useAnchorWallet: () => (walletState.publicKey ? { publicKey: walletState.publicKey } : null),
  useConnection: () => ({ connection: {} }),
}));

const market = (patch: Partial<UiMarket>): UiMarket => ({
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
  yesPool: 60_000_000n,
  noPool: 40_000_000n,
  feeBps: 100,
  lockTs: 1n,
  state: STATE.Open,
  outcome: OUTCOME.Unset,
  ...patch,
});

describe("Portfolio", () => {
  beforeEach(() => {
    walletState.publicKey = { toBase58: () => "Wallet1111111111111111111111111111111111" };
    mockUseMarkets.mockReset();
    mockUsePortfolioPositions.mockReset();
  });

  it("renders wallet positions split into open and settled tabs", () => {
    const openMarket = market({ pda: "OpenMarket1111111111111111111111111111111", marketId: 1n });
    const settledMarket = market({
      pda: "SettledMarket111111111111111111111111111",
      marketId: 2n,
      state: STATE.Resolved,
      outcome: OUTCOME.Yes,
    });
    mockUseMarkets.mockReturnValue({ data: [openMarket, settledMarket], isLoading: false });
    mockUsePortfolioPositions.mockReturnValue({
      data: [
        { market: openMarket, position: { yesAmount: 50_000_000n, noAmount: 0n, claimed: false, pda: "OpenPos" } },
        { market: settledMarket, position: { yesAmount: 40_000_000n, noAmount: 0n, claimed: false, pda: "SettledPos" } },
      ],
      isLoading: false,
    });

    render(<Portfolio />);

    expect(screen.getByRole("tab", { name: "Open (1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settled (1)" })).toBeInTheDocument();
    const openPanel = screen.getByText(/Open positions/i).closest("[data-state]");
    expect(openPanel).not.toBeNull();
    expect(within(openPanel as HTMLElement).getByText(/YES \$50/)).toBeInTheDocument();
    expect(within(openPanel as HTMLElement).getByRole("link", { name: /View market/i })).toHaveAttribute(
      "href",
      `/m/${openMarket.pda}`,
    );
  });

  it("uses PositionRow for settled positions so claim is reachable", () => {
    const settledMarket = market({
      pda: "SettledMarket111111111111111111111111111",
      state: STATE.Resolved,
      outcome: OUTCOME.Yes,
    });
    mockUseMarkets.mockReturnValue({ data: [settledMarket], isLoading: false });
    mockUsePortfolioPositions.mockReturnValue({
      data: [{ market: settledMarket, position: { yesAmount: 40_000_000n, noAmount: 0n, claimed: false, pda: "SettledPos" } }],
      isLoading: false,
    });

    render(<Portfolio />);

    fireEvent.click(screen.getByRole("tab", { name: "Settled (1)" }));
    expect(screen.getByRole("link", { name: /View Proof Receipt/i })).toHaveAttribute(
      "href",
      `/m/${settledMarket.pda}/receipt`,
    );
    expect(screen.getByRole("button", { name: "Claim" })).toBeInTheDocument();
  });

  it("asks for a connected wallet before loading positions", () => {
    walletState.publicKey = null;
    mockUseMarkets.mockReturnValue({ data: [market({})], isLoading: false });
    mockUsePortfolioPositions.mockReturnValue({ data: [], isLoading: false });

    render(<Portfolio />);

    expect(screen.getByText(/Connect a wallet to see your positions/i)).toBeInTheDocument();
  });
});
