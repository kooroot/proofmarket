import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { setup, makeMint, fundUser, marketPda, vaultPda, warpToUnix } from "./helpers";

describe("create_market", () => {
  it("opens a market and rejects a non-monotone key", async () => {
    const { context, program, payer } = await setup();
    await warpToUnix(context, 1_700_000_000);
    const mint = await makeMint(context, payer);
    const feeDest = await fundUser(context, payer, mint, Keypair.generate(), 0n);

    const id = new BN(1);
    const market = marketPda(id);
    await program.methods
      .createMarket(id, new BN(12345), 1, 7, null, null, null, 0, 0, new BN(1_700_000_999_000), 1000)
      .accounts({
        creator: payer.publicKey, market, vault: vaultPda(market),
        mint, feeDestination: feeDest,
      })
      .rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.state, 0);            // Open
    assert.equal(m.statAKey, 1);
    assert.equal(m.comparison, 0);       // GreaterThan
    assert.equal(m.feeBps, 1000);

    // non-monotone key 999 must fail UnsupportedPredicate (6105)
    let failed = false;
    try {
      const id2 = new BN(2);
      await program.methods
        .createMarket(id2, new BN(12345), 999, 7, null, null, null, 0, 0, new BN(1_700_000_999_000), 1000)
        .accounts({ creator: payer.publicKey, market: marketPda(id2), vault: vaultPda(marketPda(id2)), mint, feeDestination: feeDest })
        .rpc();
    } catch (e: any) { failed = true; assert.match(e.toString(), /6105|UnsupportedPredicate/); }
    assert.isTrue(failed);
  });
});
