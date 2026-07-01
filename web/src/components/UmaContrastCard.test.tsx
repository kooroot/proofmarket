import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { UmaContrastCard } from "./UmaContrastCard";
describe("UmaContrastCard", () => {
  it("leads with the trust-model contrast (not turnout)", () => {
    const { getByText } = render(<UmaContrastCard />);
    getByText(/Correct by construction/); getByText(/Correct by economic incentive/);
  });
  it("owns the tradeoff in the footer", () => {
    const { getByText } = render(<UmaContrastCard />);
    getByText(/you don't need 103 people to vote/);
  });
});
