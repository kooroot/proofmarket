import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketList from "./page";

const marketState = vi.hoisted(() => ({
  data: [],
  isLoading: false,
}));

vi.mock("@/hooks/useMarkets", () => ({
  useMarkets: () => marketState,
}));

vi.mock("@/hooks/useMainnetFixturePreview", () => ({
  useMainnetFixturePreview: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/components/MainnetFixturePreview", () => ({
  MainnetFixturePreviewPanel: () => <section data-testid="mainnet-preview" />,
}));

vi.mock("@/components/MarketCard", () => ({
  MarketCard: () => <article data-testid="market-card" />,
}));

describe("MarketList", () => {
  it("labels the historical replay link as Replay demo", () => {
    render(<MarketList />);

    expect(screen.getByRole("link", { name: "Replay demo" })).toHaveAttribute(
      "href",
      "/replay/18175918"
    );
    expect(screen.queryByText("Argentina 3-2 replay")).not.toBeInTheDocument();
  });
});
