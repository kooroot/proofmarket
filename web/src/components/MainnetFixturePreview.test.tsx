import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { MainnetFixturePreviewPanel } from "./MainnetFixturePreview";
import type { MainnetFixturePreview } from "@/lib/mainnet-preview";

const preview: MainnetFixturePreview = {
  network: "mainnet",
  source: "TxLINE World Cup Free Tier",
  count: 10,
  freeTiers: [
    { serviceLevel: 1, latency: "60-second delay" },
    { serviceLevel: 12, latency: "real-time" },
  ],
  fixtures: [
    {
      fixtureId: 18192996,
      participant1: "Mexico",
      participant2: "England",
      competition: "World Cup",
      startTimeMs: 1783299600000,
      markets: [
        "Match Winner",
        "Over / Under Goals",
        "Team Goals",
        "Corners Micro Market",
      ],
    },
    {
      fixtureId: 18193785,
      participant1: "USA",
      participant2: "Belgium",
      competition: "World Cup",
      startTimeMs: 1783382400000,
      markets: ["Match Winner"],
    },
  ],
};

describe("MainnetFixturePreviewPanel", () => {
  it("labels mainnet data separately from devnet settlement", () => {
    render(<MainnetFixturePreviewPanel preview={preview} />);

    expect(screen.getByText("TxLINE mainnet data preview")).toBeInTheDocument();
    expect(screen.getByText("10 fixtures detected")).toBeInTheDocument();
    expect(screen.getByText("Executable settlement stays on devnet")).toBeInTheDocument();
    expect(screen.getByText("Mexico vs England")).toBeInTheDocument();
    expect(screen.getByText("USA vs Belgium")).toBeInTheDocument();
    expect(screen.getAllByText("Match Winner").length).toBeGreaterThan(0);
    expect(screen.getByText("Over / Under Goals")).toBeInTheDocument();
  });

  it("renders a contained unavailable state instead of hiding the section", () => {
    render(<MainnetFixturePreviewPanel preview={null} isError />);

    expect(screen.getByText("Mainnet preview unavailable")).toBeInTheDocument();
    expect(screen.getByText("Executable settlement stays on devnet")).toBeInTheDocument();
  });
});
