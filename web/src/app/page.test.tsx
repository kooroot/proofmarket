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

// Hero renders the guest CTA, which pulls react-query + wallet context we don't
// provide in this unit test. Stub it — this test only cares about the Replay link.
vi.mock("@/components/PlayAsGuestButton", () => ({
  PlayAsGuestButton: () => <button data-testid="play-guest" />,
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
