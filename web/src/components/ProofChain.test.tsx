import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProofChain } from "./ProofChain";
import type { AnchorBundle } from "@/lib/proof";
const bundle: AnchorBundle = { statToProve: { key: 1, value: 1, period: 7 }, statProof: [], fixtureProof: [], mainTreeProof: [], eventStatRoot: [112,180,31,30], eventsSubTreeRoot: [249,76,119,244], fixtureId: 18172280, updateCount: 50, minTimestamp: 1782788706633, maxTimestamp: 1782788706700, ts: 1782788706633 };
describe("ProofChain", () => {
  it("renders all six step cards", () => { const { container } = render(<ProofChain bundle={bundle} dailyRoot="BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe" epochDay={20634} rootExists={true} validate={{predicateTrue:true,returnBase64:"AQ==",returnBool:true}} resolveTx="SIG" claimTxs={[]} />); expect(container.querySelectorAll("[data-step]").length).toBe(6); });
  it("renders P1-goals leaf line, no period prose", () => { const { getByText, queryByText } = render(<ProofChain bundle={bundle} dailyRoot="X" epochDay={20634} rootExists={false} validate={{predicateTrue:null,returnBase64:null,returnBool:null}} resolveTx={undefined} claimTxs={[]} />); getByText(/goals = 1/); expect(queryByText(/period/i)).toBeNull(); });
});
