import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Replay from "./page";

const replayState = vi.hoisted(() => ({
  frame: { stats: { "1": 3, "2": 2 } },
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
  it("replays the mainnet Argentina vs Cape Verde match while preserving devnet settlement framing", () => {
    replayState.done = false;

    render(<Replay />);

    expect(screen.getByText("🇦🇷 Argentina vs 🇨🇻 Cape Verde")).toBeInTheDocument();
    expect(screen.getByText("🏁 Match Winner")).toBeInTheDocument();
    expect(screen.getByText("Will Argentina beat Cape Verde?")).toBeInTheDocument();
    expect(screen.getByText("YES: Argentina wins")).toBeInTheDocument();
    expect(screen.getByText("NO: Argentina does not win")).toBeInTheDocument();
    expect(screen.getByText(/Mainnet historical fixture 18175918/i)).toBeInTheDocument();
    expect(screen.getByText(/devnet escrow pattern/i)).toBeInTheDocument();
    expect(screen.getByText("Raw stat leaf")).toBeInTheDocument();
    expect(screen.getByText("Argentina goals = 3")).toBeInTheDocument();
    expect(screen.getByText("Cape Verde goals = 2")).toBeInTheDocument();
  });
});
