import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { ProofChain } from "./ProofChain";
import type { AnchorBundle } from "@/lib/proof";
const bundle: AnchorBundle = { statToProve: { key: 1, value: 1, period: 7 }, statProof: [], fixtureProof: [], mainTreeProof: [], eventStatRoot: [112,180,31,30], eventsSubTreeRoot: [249,76,119,244], fixtureId: 18172280, updateCount: 50, minTimestamp: 1782788706633, maxTimestamp: 1782788706700, ts: 1782788706633 };
describe("ProofChain", () => {
  it("renders all six step cards", () => { const { container } = render(<ProofChain bundle={bundle} dailyRoot="BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe" epochDay={20634} rootExists={true} validate={{predicateTrue:true,returnBase64:"AQ==",returnBool:true}} resolveTx="SIG" claimTxs={[]} />); expect(container.querySelectorAll("[data-step]").length).toBe(6); });
  it("renders the complete settlement path through root, validate_stat, and escrow release", () => {
    const { getByText, getByRole } = render(<ProofChain bundle={bundle} dailyRoot="BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe" epochDay={20634} rootExists={true} validate={{predicateTrue:true,returnBase64:"AQ==",returnBool:true}} resolveTx="SIG" claimTxs={["CLAIM"]} />);

    getByText("Stat leaf — the fact being proven");
    getByText("Event-stat root");
    getByText(/Fixture sub-tree root — match 18172280/i);
    getByText(/Daily root — the on-chain anchor/i);
    getByText(/validate_stat re-walks the proof on-chain → one bool/i);
    getByText("Escrow release — winners claim");
    getByText(/inner return AQ== → TRUE/i);
    getByText(/EXISTS/i);
    expect(getByRole("link", { name: /Explorer → claim transfer/i })).toHaveAttribute("href", expect.stringContaining("CLAIM"));
  });
  it("renders P1-goals leaf line, no period prose", () => { const { getByText, queryByText } = render(<ProofChain bundle={bundle} dailyRoot="X" epochDay={20634} rootExists={false} validate={{predicateTrue:null,returnBase64:null,returnBool:null}} resolveTx={undefined} claimTxs={[]} />); getByText(/goals = 1/); expect(queryByText(/period/i)).toBeNull(); });
  it("renders both stat leaves for two-stat receipts", () => {
    const twoStat = {
      ...bundle,
      statToProve2: { key: 2, value: 0, period: 7 },
      eventStatRoot2: [12, 13, 14],
      statProof2: [],
    };
    const { getByText } = render(<ProofChain bundle={twoStat} dailyRoot="X" epochDay={20634} rootExists={false} validate={{predicateTrue:true,returnBase64:"AQ==",returnBool:true}} resolveTx={undefined} claimTxs={[]} />);
    getByText(/P1 goals = 1/);
    getByText(/P2 goals = 0/);
  });
});
