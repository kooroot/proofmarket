import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Replay from "./page";

const replayState = vi.hoisted(() => ({
  frame: { stats: { "1": 1 } },
  done: false,
}));

vi.mock("@/hooks/useReplayClock", () => ({
  useReplayClock: () => replayState,
}));

vi.mock("@/components/ProofChain", () => ({
  ProofChain: () => <div data-testid="proof-chain" />,
}));

vi.mock("@/components/UmaContrastCard", () => ({
  UmaContrastCard: () => <div data-testid="uma-contrast-card" />,
}));

describe("Replay demo", () => {
  it("uses the same World Cup market framing as the homepage while preserving devnet proof metadata", () => {
    replayState.done = false;

    render(<Replay />);

    expect(screen.getByText("🇺🇸 USA vs 🇧🇪 Belgium")).toBeInTheDocument();
    expect(screen.getByText("⚽ Team Goals")).toBeInTheDocument();
    expect(screen.getByText("Will USA score at least once?")).toBeInTheDocument();
    expect(screen.getByText("YES: USA scores")).toBeInTheDocument();
    expect(screen.getByText("NO: USA does not score")).toBeInTheDocument();
    expect(screen.getByText(/Devnet replay fixture 18172280/i)).toBeInTheDocument();
    expect(screen.getByText("Raw stat leaf")).toBeInTheDocument();
    expect(screen.getByText("P1 goals = 1")).toBeInTheDocument();
  });
});
