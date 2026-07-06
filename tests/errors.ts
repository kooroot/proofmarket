import { assert } from "chai";
import { BN } from "@coral-xyz/anchor";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import { setup, makeMint, fundUser, marketPda, vaultPda, positionPda, warpToUnix, loadGolden, ROOT_PUBKEY, TXORACLE_ID } from "./helpers";

async function expectCode(p: Promise<any>, code: RegExp) {
  let hit = false;
  try { await p; } catch (e: any) { hit = true; assert.match(e.toString(), code); }
  assert.isTrue(hit, `expected ${code}`);
}

describe("error guards", () => {
  it("FeeTooHigh 6104 on create with fee_bps > 1000", async () => {
    const { context, program, payer } = await setup();
    await warpToUnix(context, 1_700_000_000);
    const mint = await makeMint(context, payer);
    const fd = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(300); const market = marketPda(id);
    await expectCode(
      program.methods.createMarket(id, new BN(1), 1, 7, null, null, null, 0, 0, new BN(1_700_000_999_000), 1001)
        .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: fd }).rpc(),
      /6104|FeeTooHigh/);
  });

  it("ResolveTooEarly 6106 when now_ms < resolve_after_ts", async () => {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    await warpToUnix(context, Math.floor(g.maxTsMs / 1000) - 120);
    const mint = await makeMint(context, payer);
    const fd = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(301); const market = marketPda(id);
    await program.methods.createMarket(id, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, null, null, null, 0, 0, new BN(g.maxTsMs - 1000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: fd }).rpc();
    await expectCode(
      program.methods.resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
        .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID })
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]).rpc(),
      /6106|ResolveTooEarly/);
  });

  it("WrongRootAccount 6108 when a non-PDA root is supplied", async () => {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    await warpToUnix(context, Math.floor(g.maxTsMs / 1000) - 120);
    const mint = await makeMint(context, payer);
    const fd = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(302); const market = marketPda(id);
    await program.methods.createMarket(id, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, null, null, null, 0, 0, new BN(g.maxTsMs - 1000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: fd }).rpc();
    const a = Keypair.generate(); const aAta = await fundUser(context, payer, mint, a, 1000n);
    const b = Keypair.generate(); const bAta = await fundUser(context, payer, mint, b, 1000n);
    await program.methods.stake(true, new BN(1000)).accounts({ user: a.publicKey, market, position: positionPda(market, a.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([a]).rpc();
    await program.methods.stake(false, new BN(1000)).accounts({ user: b.publicKey, market, position: positionPda(market, b.publicKey), vault: vaultPda(market), userTokenAccount: bAta, mint }).signers([b]).rpc();
    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1);
    await expectCode(
      program.methods.resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
        .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: Keypair.generate().publicKey, txoracleProgram: TXORACLE_ID })
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]).rpc(),
      /6108|WrongRootAccount/);
  });

  it("FixtureMismatch 6109 when proof fixture_id != market.fixture_id", async () => {
    const { context, program, payer } = await setup();
    const g = loadGolden();
    await warpToUnix(context, Math.floor(g.maxTsMs / 1000) - 120);
    const mint = await makeMint(context, payer);
    const fd = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(303); const market = marketPda(id);
    await program.methods.createMarket(id, new BN("999999999"), g.raw.statKey, g.raw.statPeriod, null, null, null, 0, 0, new BN(g.maxTsMs - 1000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: fd }).rpc();
    const a = Keypair.generate(); const aAta = await fundUser(context, payer, mint, a, 1000n);
    const b = Keypair.generate(); const bAta = await fundUser(context, payer, mint, b, 1000n);
    await program.methods.stake(true, new BN(1000)).accounts({ user: a.publicKey, market, position: positionPda(market, a.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([a]).rpc();
    await program.methods.stake(false, new BN(1000)).accounts({ user: b.publicKey, market, position: positionPda(market, b.publicKey), vault: vaultPda(market), userTokenAccount: bAta, mint }).signers([b]).rpc();
    await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1);
    await expectCode(
      program.methods.resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
        .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID })
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]).rpc(),
      /6109|FixtureMismatch/);
  });

  it("NotClaimable 6117 when claiming an Open market", async () => {
    const { context, program, payer } = await setup();
    await warpToUnix(context, 1_700_000_000);
    const mint = await makeMint(context, payer);
    const fd = await fundUser(context, payer, mint, Keypair.generate(), 0n);
    const id = new BN(304); const market = marketPda(id);
    await program.methods.createMarket(id, new BN(1), 1, 7, null, null, null, 0, 0, new BN(1_700_999_999_000), 1000)
      .accounts({ creator: payer.publicKey, market, vault: vaultPda(market), mint, feeDestination: fd }).rpc();
    const a = Keypair.generate(); const aAta = await fundUser(context, payer, mint, a, 1000n);
    await program.methods.stake(true, new BN(1000)).accounts({ user: a.publicKey, market, position: positionPda(market, a.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([a]).rpc();
    await expectCode(
      program.methods.claim().accounts({ user: a.publicKey, market, position: positionPda(market, a.publicKey), vault: vaultPda(market), userTokenAccount: aAta, mint }).signers([a]).rpc(),
      /6117|NotClaimable/);
  });
});
