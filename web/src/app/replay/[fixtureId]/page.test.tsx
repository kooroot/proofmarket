import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Replay from "./page";

const replayState = vi.hoisted(() => ({
  clockMs: 6720282,
  frame: { stats: { "1": 2, "2": 1 } },
  done: false,
}));

vi.mock("@/hooks/useReplayClock", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useReplayClock")>(
    "@/hooks/useReplayClock"
  );
  return {
    ...actual,
    useReplayClock: () => replayState,
  };
});

vi.mock("@/components/ProofChain", () => ({
  ProofChain: () => <div data-testid="proof-chain" />,
}));

vi.mock("@/components/UmaContrastCard", () => ({
  UmaContrastCard: () => <div data-testid="uma-contrast-card" />,
}));

describe("Replay demo", () => {
  beforeEach(() => {
    replayState.clockMs = 6720282;
    replayState.frame = { stats: { "1": 2, "2": 1 } };
    replayState.done = false;
  });

  it("replays the mainnet Argentina vs Cape Verde match while preserving devnet settlement framing", () => {
    render(<Replay />);

    expect(screen.getByText("🇦🇷 Argentina vs 🇨🇻 Cape Verde")).toBeInTheDocument();
    expect(screen.getByText("🏁 Match Winner")).toBeInTheDocument();
    expect(screen.getByText("Will Argentina beat Cape Verde?")).toBeInTheDocument();
    expect(screen.getByText("YES: Argentina wins")).toBeInTheDocument();
    expect(screen.getByText("NO: Argentina does not win")).toBeInTheDocument();
    expect(screen.getByText(/Mainnet historical fixture 18175918/i)).toBeInTheDocument();
    expect(screen.getByText(/45-second compressed replay/i)).toBeInTheDocument();
    expect(screen.getByText(/devnet escrow pattern/i)).toBeInTheDocument();
    expect(screen.getByText("Raw stat leaf")).toBeInTheDocument();
    expect(screen.getByText("Argentina goals = 2")).toBeInTheDocument();
    expect(screen.getByText("Cape Verde goals = 1")).toBeInTheDocument();
    expect(screen.getByText("Live score")).toBeInTheDocument();
    expect(screen.getByText("Argentina 2 - 1 Cape Verde")).toBeInTheDocument();
    expect(screen.getByText("Goal timeline")).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText("Replay clock 112:00")).toBeInTheDocument();
    expect(screen.getByText("13:51")).toBeInTheDocument();
    expect(screen.getAllByText("Argentina")[0]).toBeInTheDocument();
    expect(screen.getByText("2-1")).toBeInTheDocument();
    expect(screen.queryByText("3-2")).not.toBeInTheDocument();
    expect(screen.getAllByText("GOAL")).toHaveLength(4);
  });

  it("keeps future goals hidden until the replay reaches them", () => {
    replayState.clockMs = 0;
    replayState.frame = { stats: { "1": 0, "2": 0 } };
    replayState.done = false;

    render(<Replay />);

    expect(screen.getByText("0/5")).toBeInTheDocument();
    expect(screen.getByText("Awaiting first scoring update…")).toBeInTheDocument();
    expect(screen.queryByText("13:51")).not.toBeInTheDocument();
    expect(screen.queryByText("GOAL")).not.toBeInTheDocument();
  });
});
