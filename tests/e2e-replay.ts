import { assert } from "chai";
import { getAccount } from "spl-token-bankrun";
import { runEndToEnd, RunResult } from "../scripts/lib/replay-run";
import { ROOT_PUBKEY } from "./helpers";

describe("e2e replay — golden fixture full lifecycle payout vector", () => {
  let r: RunResult;
  before(async () => {
    r = await runEndToEnd();
  });

  it("resolves to YES with the recorded receipt fields", () => {
    const m = r.marketAccount;
    assert.equal(m.state, 2, "state should be Resolved(2)");
    assert.equal(m.outcome, 1, "outcome should be Yes(1)");
    assert.equal(m.provenValueA, 1, "provenValueA (goals) should be 1");
    assert.equal(m.epochDay, 20634, "epochDay");
    assert.equal(m.dailyRoot.toBase58(), ROOT_PUBKEY.toBase58(), "dailyRoot PDA");
    assert.equal(m.dailyRoot.toBase58(), "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe", "frozen daily root");
    // Value-equality (not just length): resolve.rs copies these roots verbatim from the proof args,
    // so the freshly-resolved market must carry the golden bundle's exact bytes.
    assert.deepEqual(Array.from(m.eventStatRoot as number[]), r.bundle.args.statA.eventStatRoot, "eventStatRoot == golden");
    assert.deepEqual(Array.from(m.eventsSubTreeRoot as number[]), r.bundle.args.fixtureSummary.eventsSubTreeRoot, "eventsSubTreeRoot == golden");
  });

  it("records the correct parimutuel pools + fee + payout pool", () => {
    const m = r.marketAccount;
    assert.equal(m.yesPool.toNumber(), 60_000_000, "yesPool");
    assert.equal(m.noPool.toNumber(), 40_000_000, "noPool");
    assert.equal(m.winningPool.toNumber(), 60_000_000, "winningPool = YES");
    assert.equal(m.feeAmount.toNumber(), 400_000, "fee = 1% of losing pool");
    assert.equal(m.payoutPool.toNumber(), 99_600_000, "payoutPool");
  });

  it("pays winners pro-rata and the loser zero", async () => {
    const [a, c, b] = r.burners;
    const balA = Number((await getAccount(r.context.banksClient, a.ata)).amount);
    const balC = Number((await getAccount(r.context.banksClient, c.ata)).amount);
    const balB = Number((await getAccount(r.context.banksClient, b.ata)).amount);
    assert.equal(balA, 66_400_000, "A (YES 40) payout");
    assert.equal(balC, 33_200_000, "C (YES 20) payout");
    assert.equal(balB, 0, "B (NO 40, loser) payout");
  });

  it("leaves exactly the fee as vault residual", async () => {
    const residual = Number((await getAccount(r.context.banksClient, r.vault)).amount);
    assert.equal(residual, 400_000, "vault residual == feeAmount");
  });
});
