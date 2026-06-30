import { readFileSync } from "fs";
import { startAnchor, Clock, ProgramTestContext } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { Program, BN, web3 } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createMint, createAssociatedTokenAccount, mintTo } from "spl-token-bankrun";
import { Proofmarket } from "../target/types/proofmarket";
import IDL from "../target/idl/proofmarket.json";

export const TXORACLE_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
export const ROOT_PUBKEY = new PublicKey("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");

export function pinnedMint(): Keypair {
  const raw = JSON.parse(readFileSync(__dirname + "/../keys/usdc-mint.json", "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function loadRootAccount() {
  const j = JSON.parse(readFileSync(__dirname + "/fixtures/daily_root.json", "utf8")).account;
  return {
    address: ROOT_PUBKEY,
    info: {
      lamports: j.lamports,
      data: Buffer.from(j.data[0], "base64"),
      owner: new PublicKey(j.owner),
      executable: j.executable,
      rentEpoch: 0,
    },
  };
}

export async function setup() {
  const context = await startAnchor(
    __dirname + "/..",
    [{ name: "txoracle", programId: TXORACLE_ID }], // tests/fixtures/txoracle.so
    [loadRootAccount()]
  );
  const provider = new BankrunProvider(context);
  const program = new Program<Proofmarket>(IDL as Proofmarket, provider);
  return { context, provider, program, payer: context.payer };
}

export async function makeMint(context: ProgramTestContext, payer: Keypair): Promise<PublicKey> {
  const mintKp = pinnedMint();
  return await createMint(context.banksClient, payer, payer.publicKey, null, 6, mintKp);
}

export async function fundUser(
  context: ProgramTestContext, payer: Keypair, mint: PublicKey, owner: Keypair, amount: bigint
): Promise<PublicKey> {
  // Seed the owner's SOL balance so they can pay for transaction fees and
  // rent-exempt account creation (e.g. init_if_needed for Position).
  context.setAccount(owner.publicKey, {
    lamports: 10_000_000,
    data: Buffer.alloc(0),
    owner: web3.SystemProgram.programId,
    executable: false,
  });
  const ata = await createAssociatedTokenAccount(context.banksClient, payer, mint, owner.publicKey);
  await mintTo(context.banksClient, payer, mint, ata, payer, amount);
  return ata;
}

const PID = new PublicKey(IDL.address);
export const marketPda = (id: BN) =>
  PublicKey.findProgramAddressSync([Buffer.from("market"), id.toArrayLike(Buffer, "le", 8)], PID)[0];
export const vaultPda = (market: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], PID)[0];
export const positionPda = (market: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("position"), market.toBuffer(), owner.toBuffer()], PID)[0];

export async function warpToUnix(context: ProgramTestContext, unixSecs: number) {
  const c = await context.banksClient.getClock();
  context.setClock(new Clock(c.slot, c.epochStartTimestamp, c.epoch, c.leaderScheduleEpoch, BigInt(unixSecs)));
}
