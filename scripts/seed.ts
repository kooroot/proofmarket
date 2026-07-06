// Devnet seed: deploy executable demo markets and stake a fixed YES/NO split.
//
// FUNDING-GATED: requires a funded ANCHOR_WALLET (the deploy wallet), the proofmarket program
// already deployed, and the pinned USDC mint already created. Run with:
//   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=keys/devnet-deployer.json \
//     npx ts-node --transpile-only scripts/seed.ts
//
// The market is left OPEN (resolve_after_ts far in the future). A live resolve is intentionally
// NOT performed: the golden proof's max_timestamp is historical, and resolve's finality gate
// (max_timestamp >= resolve_after_ts) cannot hold against a future resolve_after_ts without a
// controllable clock — so the resolved Proof Receipt is produced hermetically (`yarn e2e-replay`).
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import IDL from "../target/idl/proofmarket.json";

const MINT = new PublicKey("2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT"); // constants::USDC_MINT
const FIXTURE_ID = new BN(18172280); // golden fixture (G6 bundle)
const STAT_PERIOD = 7; // full-game monotone cumulative stat period
const COMPARISON = 0; // greaterThan
const FEE_BPS = 100; // 1% (matches the golden Proof Receipt)
const RESOLVE_AFTER_MS = Date.now() + 30 * 86_400_000; // +30d → stays OPEN through judging

const MARKETS = [
  {
    id: 1,
    label: "P1 goals > 0",
    statA: 1,
    statB: null,
    op: null,
    threshold: 0,
  },
  { id: 2, label: "Total goals > 2", statA: 1, statB: 2, op: 1, threshold: 2 },
  {
    id: 3,
    label: "P1 goals - P2 goals > 0",
    statA: 1,
    statB: 2,
    op: 2,
    threshold: 0,
  },
  {
    id: 4,
    label: "P1 corners - P2 corners > 0",
    statA: 7,
    statB: 8,
    op: 2,
    threshold: 0,
  },
] as const;

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(IDL as anchor.Idl, provider);
  const deployer = (provider.wallet as anchor.Wallet).payer;
  const pid = program.programId;

  const seed = (t: string, k: Buffer[]) =>
    PublicKey.findProgramAddressSync([Buffer.from(t), ...k], pid)[0];
  const fundSol = async (to: PublicKey, lamports: number) => {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deployer.publicKey,
        toPubkey: to,
        lamports,
      })
    );
    return provider.sendAndConfirm(tx);
  };

  // fee destination = the deployer's USDC ATA (Account<TokenAccount> of MINT).
  const feeDest = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      deployer,
      MINT,
      deployer.publicKey
    )
  ).address;
  console.log("feeDestination:", feeDest.toBase58());

  // Golden 60/40 vector: A 40 + C 20 = 60 YES, B 40 NO. All >= MIN_STAKE (1_000).
  const split: [string, boolean, number][] = [
    ["A", true, 40_000_000],
    ["C", true, 20_000_000],
    ["B", false, 40_000_000],
  ];

  for (const def of MARKETS) {
    const marketId = new BN(def.id);
    const market = seed("market", [marketId.toArrayLike(Buffer, "le", 8)]);
    const vault = seed("vault", [market.toBuffer()]);
    const existing = await provider.connection.getAccountInfo(market);
    let created = false;

    console.log(`\n=== MARKET ${def.id}: ${def.label} ===`);
    if (existing) {
      console.log("createMarket: skipped existing", market.toBase58());
    } else {
      const createSig = await program.methods
        .createMarket(
          marketId,
          FIXTURE_ID,
          def.statA,
          STAT_PERIOD,
          def.statB,
          def.statB === null ? null : STAT_PERIOD,
          def.op,
          def.threshold,
          COMPARISON,
          new BN(RESOLVE_AFTER_MS),
          FEE_BPS
        )
        .accounts({
          creator: deployer.publicKey,
          market,
          vault,
          mint: MINT,
          feeDestination: feeDest,
        })
        .rpc();
      created = true;
      console.log("createMarket:", market.toBase58(), "sig", createSig);
    }

    if (created) {
      for (const [name, side, amount] of split) {
        const u = Keypair.generate();
        await fundSol(u.publicKey, 20_000_000); // 0.02 SOL: covers Position rent + tx fee (deployer pays the ATA)
        const ata = await createAssociatedTokenAccount(
          provider.connection,
          deployer,
          MINT,
          u.publicKey
        );
        await mintTo(
          provider.connection,
          deployer,
          MINT,
          ata,
          deployer,
          amount
        ); // authority = deployer
        const position = seed("position", [
          market.toBuffer(),
          u.publicKey.toBuffer(),
        ]);
        const sig = await program.methods
          .stake(side, new BN(amount))
          .accounts({
            user: u.publicKey,
            market,
            position,
            vault,
            userTokenAccount: ata,
            mint: MINT,
          })
          .signers([u])
          .rpc();
        console.log(
          `stake ${name} ${side ? "YES" : "NO"} ${
            amount / 1e6
          } USDC  user ${u.publicKey.toBase58()}  sig ${sig}`
        );
      }
    }

    // Verify on-chain state.
    const m: any = await program.account.market.fetch(market);
    const vaultBal = Number(
      (await getAccount(provider.connection, vault)).amount
    );
    console.log("market      :", market.toBase58());
    console.log("state       :", m.state, "(0=OPEN)");
    console.log("yesPool     :", m.yesPool.toNumber());
    console.log("noPool      :", m.noPool.toNumber());
    console.log("totalPos    :", m.totalPositions);
    console.log("vault USDC  :", vaultBal);
    console.log("feeBps      :", m.feeBps);
    console.log("resolveAfter:", m.resolveAfterTs.toString());

    if (created) {
      const ok =
        m.yesPool.toNumber() === 60_000_000 &&
        m.noPool.toNumber() === 40_000_000 &&
        m.totalPositions === 3 &&
        vaultBal === 100_000_000;
      console.log(
        ok
          ? "SEED OK: YES 60 / NO 40 / 3 positions / vault 100 USDC"
          : "SEED MISMATCH"
      );
      if (!ok) process.exit(1);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
