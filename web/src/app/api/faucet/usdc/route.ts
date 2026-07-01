import { NextRequest, NextResponse } from "next/server";
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from "bs58";
import { getConnection } from "@/lib/connection";
import { USDC_MINT } from "@/lib/constants";
import { allow } from "./throttle";
const AMOUNT = 1_000_000_000n; // 1,000 USDC @ 6dp
const seen = new Map<string, number>();
export async function POST(req: NextRequest) {
  const { pubkey } = await req.json();
  if (!allow(pubkey, seen, Date.now())) return NextResponse.json({ error: "throttled" }, { status: 429 });
  const conn = getConnection();
  const authority = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(process.env.FAUCET_AUTHORITY_SECRET!)));
  const owner = new PublicKey(pubkey);
  const ata = await getOrCreateAssociatedTokenAccount(conn, authority, USDC_MINT, owner);
  const sig = await mintTo(conn, authority, USDC_MINT, ata.address, authority, Number(AMOUNT));
  const sol = await conn.getBalance(owner);
  if (sol === 0) {
    const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: owner, lamports: 0.01 * LAMPORTS_PER_SOL }));
    await sendAndConfirmTransaction(conn, tx, [authority]);
  }
  return NextResponse.json({ sig, ata: ata.address.toBase58(), amount: AMOUNT.toString() });
}
