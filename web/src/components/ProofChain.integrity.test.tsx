import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ProofChain } from "./ProofChain";
import { adaptProofBundle } from "@/lib/proof";
import golden from "../../public/replay/18172280.json";

// The A.7 on-chain snapshot lives outside the web/ vite root — read it via node fs.
const testDir = dirname(fileURLToPath(import.meta.url));
const resolvedMarket = JSON.parse(
  readFileSync(resolve(testDir, "../../../tests/fixtures/resolved-market.json"), "utf8"),
) as {
  eventStatRoot: number[];
  eventsSubTreeRoot: number[];
  dailyRoot: string;
  epochDay: number;
  state: number;
  outcome: number;
  provenValueA: number;
};

const b = adaptProofBundle(golden.bundle);

describe("ProofChain receipt integrity (on-chain capture ↔ golden bundle)", () => {
  it("on-chain eventStatRoot matches the golden bundle root byte-for-byte", () => {
    expect(resolvedMarket.eventStatRoot).toEqual(b.eventStatRoot);
    expect(resolvedMarket.eventStatRoot.length).toBe(32);
  });

  it("on-chain eventsSubTreeRoot matches the golden sub-tree root byte-for-byte", () => {
    expect(resolvedMarket.eventsSubTreeRoot).toEqual(b.eventsSubTreeRoot);
    expect(resolvedMarket.eventsSubTreeRoot.length).toBe(32);
  });

  it("on-chain dailyRoot + epochDay match the golden daily-root PDA", () => {
    expect(resolvedMarket.dailyRoot).toBe(golden.dailyRootPda);
    expect(resolvedMarket.dailyRoot).toBe("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
    expect(resolvedMarket.epochDay).toBe(golden.epochDay);
    expect(resolvedMarket.epochDay).toBe(20634);
  });

  it("the market resolved to a proven YES outcome", () => {
    expect(resolvedMarket.state).toBe(2); // Resolved
    expect(resolvedMarket.outcome).toBe(1); // Yes
    expect(resolvedMarket.provenValueA).toBe(1);
  });

  it("the proven leaf {key,value,period} matches the golden statToProve", () => {
    expect(b.statToProve).toEqual({ key: 1, value: 1, period: 7 });
  });

  it("ProofChain renders the 6-step proof chain over the real golden bundle", () => {
    const { container, getByText } = render(
      <ProofChain
        bundle={b}
        dailyRoot={golden.dailyRootPda}
        epochDay={golden.epochDay}
        rootExists={true}
        validate={{ predicateTrue: true, returnBase64: "AQ==", returnBool: true }}
        resolveTx={golden.resolveTx ?? undefined}
        claimTxs={golden.claimTxs ?? []}
      />,
    );
    expect(container.querySelectorAll("[data-step]").length).toBe(6);
    getByText(/goals = 1/); // Step 0: the P1-goals leaf line
    getByText(/AQ==/); // Step 4: validate_stat inner return
  });
});
