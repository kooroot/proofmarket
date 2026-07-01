import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TwinBar } from "./TwinBar";
describe("TwinBar", () => {
  it("renders parimutuel % and an outlined fair bar when priced", () => {
    const { getByText, container } = render(<TwinBar pYes={0.61} pFair={0.55} />);
    getByText("61%"); expect(container.querySelectorAll("[data-bar]").length).toBe(2);
  });
  it("omits the fair bar for unpriced props", () => {
    const { container } = render(<TwinBar pYes={0.4} pFair={null} />);
    expect(container.querySelectorAll("[data-bar]").length).toBe(1);
  });
});
