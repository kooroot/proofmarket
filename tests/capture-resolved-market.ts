import { assert } from "chai";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runEndToEnd } from "../scripts/lib/replay-run";

// Serialize an anchor-decoded Market account to plain, JSON-safe values.
// BN -> decimal string (no precision loss), PublicKey -> base58, [u8;32] -> number[], Option::None -> null.
function serializeMarket(m: any) {
  const s = (x: any) => x.toString();            // BN
  const b58 = (x: any) => x.toBase58();          // PublicKey
  const bytes = (x: any) => Array.from(x as number[]); // [u8;N]
  const opt = (x: any) => (x === null || x === undefined ? null : x);
  return {
    bump: m.bump,
    vaultBump: m.vaultBump,
    marketId: s(m.marketId),
    creator: b58(m.creator),
    mint: b58(m.mint),
    fixtureId: s(m.fixtureId),
    feeDestination: b58(m.feeDestination),
    statAKey: m.statAKey,
    statAPeriod: m.statAPeriod,
    statBKey: opt(m.statBKey),
    statBPeriod: opt(m.statBPeriod),
    op: opt(m.op),
    threshold: m.threshold,
    comparison: m.comparison,
    resolveAfterTs: s(m.resolveAfterTs),
    createdAt: s(m.createdAt),
    resolvedAt: s(m.resolvedAt),
    state: m.state,
    outcome: m.outcome,
    yesPool: s(m.yesPool),
    noPool: s(m.noPool),
    yesStakers: m.yesStakers,
    noStakers: m.noStakers,
    totalPositions: m.totalPositions,
    feeBps: m.feeBps,
    feeAmount: s(m.feeAmount),
    payoutPool: s(m.payoutPool),
    winningPool: s(m.winningPool),
    claimedAmount: s(m.claimedAmount),
    claimsCount: m.claimsCount,
    provenValueA: m.provenValueA,
    provenValueB: opt(m.provenValueB),
    dailyRoot: b58(m.dailyRoot),
    epochDay: m.epochDay,
    eventStatRoot: bytes(m.eventStatRoot),
    eventsSubTreeRoot: bytes(m.eventsSubTreeRoot),
    resolveTs: s(m.resolveTs),
  };
}

describe("capture resolved-market.json (bankrun golden lifecycle snapshot)", () => {
  it("resolves the golden fixture and writes the on-chain Market snapshot", async () => {
    const r = await runEndToEnd();
    const snapshot = serializeMarket(r.marketAccount);

    const outPath = join(__dirname, "fixtures", "resolved-market.json");
    writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");

    // Controller-inspectable: the two 32-byte proof roots recorded on-chain by resolve.
    console.log("eventStatRoot", JSON.stringify(snapshot.eventStatRoot));
    console.log("eventsSubTreeRoot", JSON.stringify(snapshot.eventsSubTreeRoot));
    console.log("resolveTs", snapshot.resolveTs, "resolvedAt", snapshot.resolvedAt);

    // Assert the known-resolved fields (a serializer field-name typo would surface here).
    assert.equal(snapshot.state, 2, "state Resolved");
    assert.equal(snapshot.outcome, 1, "outcome Yes");
    assert.equal(snapshot.provenValueA, 1, "provenValueA");
    assert.equal(snapshot.epochDay, 20634, "epochDay");
    assert.equal(snapshot.dailyRoot, "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe", "dailyRoot");
    assert.equal(snapshot.winningPool, "60000000", "winningPool");
    assert.equal(snapshot.feeAmount, "400000", "feeAmount");
    assert.equal(snapshot.payoutPool, "99600000", "payoutPool");
    assert.equal(snapshot.eventStatRoot.length, 32, "eventStatRoot is 32 bytes");
    assert.equal(snapshot.eventsSubTreeRoot.length, 32, "eventsSubTreeRoot is 32 bytes");
  });
});
