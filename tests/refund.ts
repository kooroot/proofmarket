import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import { getAccount } from "spl-token-bankrun";
import { setup, makeMint, fundUser, marketPda, vaultPda, positionPda, warpToUnix, loadGolden, ROOT_PUBKEY, TXORACLE_ID } from "./helpers";

describe("refund (Void)", () => {
  it("one-sided market voids and refunds 100% no fee", async () => {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    await warpToUnix(context, Math.floor(g.maxTsMs / 1000) - 120);
    const mint = await makeMint(context, payer);
    const fd = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(400); const market = marketPda(id);
    await program.methods.createMarket(id, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, 0, 0, new BN(g.maxTsMs - 1000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: fd }).rpc();

    const a = Keypair.generate(); const aAta = await fundUser(context, payer, mint, a, 1000n);
    await program.methods.stake(true, new BN(1000)).accounts({ user: a.publicKey, market, position: positionPda(market, a.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([a]).rpc();

    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1);
    await program.methods.resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
      .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]).rpc();
    assert.equal((await program.account.market.fetch(market)).state, 3); // Void

    await program.methods.refund().accounts({ user: a.publicKey, market, position: positionPda(market, a.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([a]).rpc();
    assert.equal(Number((await getAccount(context.banksClient, aAta)).amount), 1000); // full refund
    assert.isNull(await context.banksClient.getAccount(positionPda(market, a.publicKey)));
  });
});
