import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Receipt from "./page";

describe("Receipt page", () => {
  it("uses the same mainnet historical proof story as the replay demo", () => {
    render(<Receipt params={{ marketPda: "Market1111111111111111111111111111111111" }} />);

    expect(screen.getByText(/Argentina 3-2 Cape Verde/i)).toBeInTheDocument();
    expect(screen.getByText(/TxLINE mainnet historical proof/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Replay the fixture clock/i })).toHaveAttribute(
      "href",
      "/replay/18175918",
    );
  });
});
