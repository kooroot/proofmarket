// Resume the devnet seed: add the missing NO staker to demo market id=1 if noPool < 40 USDC.
// Idempotent + low-RPC-pressure (batched ATA+mint into one tx, delays + 429 retry) so the public
// devnet endpoint's rate limiter doesn't abort mid-run. Same env as seed.ts.
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount,
} from "@solana/spl-token";
import IDL from "../target/idl/proofmarket.json";

const MINT = new PublicKey("2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT");
const MARKET_ID = new BN(1);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      const is429 = String(e).includes("429") || String(e).includes("Too Many Requests");
      if (!is429 || i === tries - 1) throw e;
      const wait = 2000 * (i + 1);
      console.log(`  ${label}: 429 → retry in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw new Error("unreachable");
}

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(IDL as anchor.Idl, provider);
  const deployer = (provider.wallet as anchor.Wallet).payer;
  const pid = program.programId;
  const seed = (t: string, k: Buffer[]) => PublicKey.findProgramAddressSync([Buffer.from(t), ...k], pid)[0];
  const market = seed("market", [MARKET_ID.toArrayLike(Buffer, "le", 8)]);
  const vault = seed("vault", [market.toBuffer()]);

  let m: any = await withRetry("fetch", () => program.account.market.fetch(market));
  console.log("market:", market.toBase58(), "state", m.state, "YES", m.yesPool.toNumber(), "NO", m.noPool.toNumber(), "pos", m.totalPositions);

  if (m.noPool.toNumber() < 40_000_000) {
    const amount = 40_000_000;
    const u = Keypair.generate();
    console.log("adding NO staker:", u.publicKey.toBase58());

    await withRetry("fundSol", () =>
      provider.sendAndConfirm(new Transaction().add(
        SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: u.publicKey, lamports: 20_000_000 }))));
    await sleep(2500);

    const ata = getAssociatedTokenAddressSync(MINT, u.publicKey);
    await withRetry("ata+mint", () =>
      provider.sendAndConfirm(new Transaction().add(
        createAssociatedTokenAccountInstruction(deployer.publicKey, ata, u.publicKey, MINT),
        createMintToInstruction(MINT, ata, deployer.publicKey, amount))));
    await sleep(2500);

    const position = seed("position", [market.toBuffer(), u.publicKey.toBuffer()]);
    const sig = await withRetry("stake", () =>
      program.methods.stake(false, new BN(amount))
        .accounts({ user: u.publicKey, market, position, vault, userTokenAccount: ata, mint: MINT })
        .signers([u]).rpc());
    console.log("stake B NO 40 USDC  sig", sig);
    await sleep(2500);
    m = await withRetry("re-fetch", () => program.account.market.fetch(market));
  }

  const vaultBal = Number((await withRetry("vault", () => getAccount(provider.connection, vault))).amount);
  console.log("\n=== FINAL MARKET STATE ===");
  console.log("market   :", market.toBase58());
  console.log("state    :", m.state, "(0=OPEN)");
  console.log("yesPool  :", m.yesPool.toNumber());
  console.log("noPool   :", m.noPool.toNumber());
  console.log("totalPos :", m.totalPositions);
  console.log("vault    :", vaultBal);
  const ok = m.yesPool.toNumber() === 60_000_000 && m.noPool.toNumber() === 40_000_000 && m.totalPositions === 3 && vaultBal === 100_000_000;
  console.log(ok ? "\nSEED COMPLETE ✓ (YES 60 / NO 40 / 3 positions / vault 100 USDC)" : "\nSTILL INCOMPLETE ✗");
  if (!ok) process.exit(1);
})().catch((e) => { console.error(String(e)); process.exit(1); });
