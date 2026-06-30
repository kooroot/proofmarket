import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import { getAccount } from "spl-token-bankrun";
import { setup, makeMint, fundUser, marketPda, vaultPda, positionPda, warpToUnix, loadGolden, ROOT_PUBKEY, TXORACLE_ID } from "./helpers";

describe("claim", () => {
  it("pays the winner pro-rata, loser claims 0 + closes position, double-claim rejected", async () => {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    await warpToUnix(context, Math.floor(g.maxTsMs / 1000) - 120);
    const mint = await makeMint(context, payer);
    const feeDest = await fundUser(context, payer, mint, Keypair.generate(), 0n);

    const id = new BN(200);
    const market = marketPda(id);
    await program.methods.createMarket(id, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, 0, 0, new BN(g.maxTsMs - 1000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: feeDest }).rpc();

    // Yes 1000 (winner), No 1000 (loser)
    const winner = Keypair.generate(); const winAta = await fundUser(context, payer, mint, winner, 1000n);
    const loser = Keypair.generate();  const loseAta = await fundUser(context, payer, mint, loser, 1000n);
    await program.methods.stake(true, new BN(1000)).accounts({ user: winner.publicKey, market, position: positionPda(market, winner.publicKey), vault: vaultPda(market), userTokenAccount: winAta, mint }).signers([winner]).rpc();
    await program.methods.stake(false, new BN(1000)).accounts({ user: loser.publicKey, market, position: positionPda(market, loser.publicKey), vault: vaultPda(market), userTokenAccount: loseAta, mint }).signers([loser]).rpc();

    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1);
    await program.methods.resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
      .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]).rpc();

    // winner claims: payout = 1000 * payoutPool(1900) / winningPool(1000) = 1900
    await program.methods.claim().accounts({ user: winner.publicKey, market, position: positionPda(market, winner.publicKey), vault: vaultPda(market), userTokenAccount: winAta, mint }).signers([winner]).rpc();
    const winBal = await getAccount(context.banksClient, winAta);
    assert.equal(Number(winBal.amount), 1900);

    // winner double-claim -> position account is closed -> AccountNotInitialized / AlreadyClaimed
    let dbl = false;
    try {
      await program.methods.claim().accounts({ user: winner.publicKey, market, position: positionPda(market, winner.publicKey), vault: vaultPda(market), userTokenAccount: winAta, mint }).signers([winner]).rpc();
    } catch (e: any) { dbl = true; }
    assert.isTrue(dbl);

    // loser claims: payout 0, position closed (rent recovered), no revert
    await program.methods.claim().accounts({ user: loser.publicKey, market, position: positionPda(market, loser.publicKey), vault: vaultPda(market), userTokenAccount: loseAta, mint }).signers([loser]).rpc();
    const closed = await context.banksClient.getAccount(positionPda(market, loser.publicKey));
    assert.isNull(closed); // position rent-reclaimed via close=user
  });
});
