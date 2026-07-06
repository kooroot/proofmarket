import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { setup, makeMint, fundUser, marketPda, vaultPda, positionPda, warpToUnix } from "./helpers";

describe("stake", () => {
  it("records YES+NO pools, rejects below MIN_STAKE", async () => {
    const { context, program, payer } = await setup();
    await warpToUnix(context, 1_700_000_000);
    const mint = await makeMint(context, payer);
    const feeDest = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(10);
    const market = marketPda(id);
    await program.methods.createMarket(id, new BN(12345), 1, 7, null, null, null, 0, 0, new BN(1_700_999_999_000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: feeDest }).rpc();

    const alice = Keypair.generate();
    const aliceAta = await fundUser(context, payer, mint, alice, 1_000_000n);
    await program.methods.stake(true, new BN(500_000))
      .accounts({ user: alice.publicKey, market, position: positionPda(market, alice.publicKey),
        vault: vaultPda(market), userTokenAccount: aliceAta, mint })
      .signers([alice]).rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.yesPool.toNumber(), 500_000);
    assert.equal(m.yesStakers, 1);
    assert.equal(m.totalPositions, 1);

    // below MIN_STAKE (1000) -> StakeTooSmall 6103
    let failed = false;
    try {
      await program.methods.stake(false, new BN(500))
        .accounts({ user: alice.publicKey, market, position: positionPda(market, alice.publicKey),
          vault: vaultPda(market), userTokenAccount: aliceAta, mint })
        .signers([alice]).rpc();
    } catch (e: any) { failed = true; assert.match(e.toString(), /6103|StakeTooSmall/); }
    assert.isTrue(failed);
  });
});
