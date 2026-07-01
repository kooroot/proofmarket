import { assert } from "chai";
import { dailyRootPda } from "./helpers";
import { RUN_DEFAULTS } from "../scripts/lib/replay-run";

describe("replay-run assembly (no validator)", () => {
  it("dailyRootPda(20634) equals the frozen on-chain BcLwqH root", () => {
    assert.equal(dailyRootPda(20634).toBase58(), "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
  });

  it("runEndToEnd defaults match the P4.2 payout vector (3 burners, 1% fee, golden fixture)", () => {
    assert.equal(RUN_DEFAULTS.fixtureId, 18172280);
    assert.equal(RUN_DEFAULTS.epochDay, 20634);
    assert.equal(RUN_DEFAULTS.statKey, 1);
    assert.equal(RUN_DEFAULTS.statPeriod, 7);
    assert.equal(RUN_DEFAULTS.feeBps, 100);
    assert.deepEqual(RUN_DEFAULTS.stakes, [
      { side: true, amount: 40_000_000 },  // A YES 40 USDC
      { side: true, amount: 20_000_000 },  // C YES 20 USDC
      { side: false, amount: 40_000_000 }, // B NO 40 USDC
    ]);
  });
});
