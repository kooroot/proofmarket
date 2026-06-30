import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import { setup, makeMint, fundUser, marketPda, vaultPda, positionPda, warpToUnix, loadGolden, ROOT_PUBKEY, TXORACLE_ID } from "./helpers";

describe("resolve (validate_stat CPI)", () => {
  async function stakeBoth(context: any, program: any, payer: any, mint: any, market: any) {
    // Corrected amounts: each >= MIN_STAKE(1000); YES=10000, NO=10000.
    for (const [side, amt] of [[true, 6000], [true, 4000], [false, 3000], [false, 7000]] as [boolean, number][]) {
      const u = Keypair.generate();
      const ata = await fundUser(context, payer, mint, u, BigInt(amt));
      await program.methods.stake(side, new BN(amt))
        .accounts({ user: u.publicKey, market, position: positionPda(market, u.publicKey), vault: vaultPda(market), userTokenAccount: ata, mint })
        .signers([u]).rpc();
    }
  }

  async function runResolve(thresholdMakesTrue: boolean) {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    const createClock = Math.floor(g.maxTsMs / 1000) - 120;      // before lock
    const resolveAfterMs = g.maxTsMs - 1000;                     // <= maxTs (finality ok)
    await warpToUnix(context, createClock);                      // create: resolveAfter is future

    const mint = await makeMint(context, payer);
    const feeDest = await fundUser(context, payer, mint, Keypair.generate(), 0n);

    const id = new BN(thresholdMakesTrue ? 100 : 101);
    const market = marketPda(id);
    const threshold = thresholdMakesTrue ? 0 : 1; // value=1: 1>0 true ; 1>1 false
    await program.methods
      .createMarket(id, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, threshold, 0, new BN(resolveAfterMs), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: feeDest })
      .rpc();

    await stakeBoth(context, program, payer, mint, market);

    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1); // resolve: now >= resolveAfter

    await program.methods
      .resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
      .accounts({
        resolver: payer.publicKey, market,
        dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID,
      })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();

    return await program.account.market.fetch(market);
  }

  it("TRUE path -> outcome YES, Resolved, receipt fields recorded", async () => {
    const m = await runResolve(true);
    assert.equal(m.state, 2);            // Resolved
    assert.equal(m.outcome, 1);          // Yes
    assert.equal(m.provenValueA, 1);
    assert.equal(m.epochDay, 20634);
    assert.equal(m.dailyRoot.toBase58(), ROOT_PUBKEY.toBase58());
    assert.equal(m.winningPool.toNumber(), 10000);              // yes side
    assert.equal(m.feeAmount.toNumber(), 1000);                 // floor(10000*1000/10000)
    assert.equal(m.payoutPool.toNumber(), 10000 + (10000 - 1000)); // 19000
  });

  it("FALSE path -> outcome NO, NO pool wins", async () => {
    const m = await runResolve(false);
    assert.equal(m.state, 2);
    assert.equal(m.outcome, 2);          // No
    assert.equal(m.winningPool.toNumber(), 10000);             // no side
    assert.equal(m.feeAmount.toNumber(), 1000);
    assert.equal(m.payoutPool.toNumber(), 19000);
  });
});
