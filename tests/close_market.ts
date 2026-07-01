import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import { getAccount } from "spl-token-bankrun";
import {
  setup, makeMint, fundUser, marketPda, vaultPda, positionPda, warpToUnix,
  loadGolden, ROOT_PUBKEY, TXORACLE_ID,
} from "./helpers";

const CLOSE_GRACE_SECS = 86_400; // CLOSE_GRACE_MS (86_400_000) / 1000

describe("close_market (fee+dust sweep + rent reclaim)", () => {
  it("sweeps the 400_000 residual fee to fee_destination and closes vault + market", async () => {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    await warpToUnix(context, Math.floor(g.maxTsMs / 1000) - 120); // before lock
    const mint = await makeMint(context, payer);
    const feeDest = await fundUser(context, payer, mint, Keypair.generate(), 0n); // a USDC ATA (Contract)

    const id = new BN(500);
    const market = marketPda(id);
    // P4.2 vector: YES 60 (40+20), NO 40, fee_bps 100 (1%) -> residual fee = 400_000.
    await program.methods
      .createMarket(id, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, 0, 0, new BN(g.maxTsMs - 1000), 100)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: feeDest })
      .rpc();

    const A = Keypair.generate(); const aAta = await fundUser(context, payer, mint, A, 40_000_000n);
    const C = Keypair.generate(); const cAta = await fundUser(context, payer, mint, C, 20_000_000n);
    const B = Keypair.generate(); const bAta = await fundUser(context, payer, mint, B, 40_000_000n);
    await program.methods.stake(true, new BN(40_000_000))
      .accounts({ user: A.publicKey, market, position: positionPda(market, A.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([A]).rpc();
    await program.methods.stake(true, new BN(20_000_000))
      .accounts({ user: C.publicKey, market, position: positionPda(market, C.publicKey), vault: vaultPda(market), userTokenAccount: cAta, mint }).signers([C]).rpc();
    await program.methods.stake(false, new BN(40_000_000))
      .accounts({ user: B.publicKey, market, position: positionPda(market, B.publicKey), vault: vaultPda(market), userTokenAccount: bAta, mint }).signers([B]).rpc();

    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1); // now >= resolve_after_ts AND maxTs >= resolve_after_ts
    await program.methods
      .resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
      .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]).rpc();

    const resolved = await program.account.market.fetch(market);
    assert.equal(resolved.state, 2);                 // Resolved
    assert.equal(resolved.outcome, 1);               // Yes (value 1 > threshold 0)
    assert.equal(resolved.feeAmount.toNumber(), 400_000);

    // all winners (A,C) + the loser (B) claim -> vault drains to exactly the 400_000 fee residual.
    for (const [kp, ata] of [[A, aAta], [C, cAta], [B, bAta]] as const) {
      await program.methods.claim()
        .accounts({ user: kp.publicKey, market, position: positionPda(market, kp.publicKey), vault: vaultPda(market), userTokenAccount: ata, mint })
        .signers([kp]).rpc();
    }
    assert.equal(Number((await getAccount(context.banksClient, vaultPda(market))).amount), 400_000);

    // before the grace window elapses -> MarketNotSettled (6120).
    let early = false;
    try {
      await program.methods.closeMarket()
        .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), feeDestination: feeDest, mint }).rpc();
    } catch (e: any) { early = true; assert.match(e.toString(), /6120|MarketNotSettled/); }
    assert.isTrue(early);

    // warp past resolved_at + CLOSE_GRACE_MS, capture creator rent baseline, then close.
    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1 + CLOSE_GRACE_SECS + 1);
    const creatorBefore = await context.banksClient.getBalance(payer.publicKey);
    await program.methods.closeMarket()
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), feeDestination: feeDest, mint }).rpc();

    // fee swept to fee_destination; vault + market closed; rent returned to creator.
    assert.equal(Number((await getAccount(context.banksClient, feeDest)).amount), 400_000);
    assert.isNull(await context.banksClient.getAccount(vaultPda(market)));   // vault closed
    assert.isNull(await context.banksClient.getAccount(market));            // market closed
    const creatorAfter = await context.banksClient.getBalance(payer.publicKey);
    assert.isTrue(creatorAfter > creatorBefore); // Market + vault rent reclaimed (>> tx fee)
  });
});
