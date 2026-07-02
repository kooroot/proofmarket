import { NextRequest, NextResponse } from "next/server";
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from "bs58";
import { getConnection } from "@/lib/connection";
import { USDC_MINT } from "@/lib/constants";
import { allow, allowSolGrant, isValidPubkey, SOL_GRANT_LAMPORTS, type SolBudget } from "./throttle";
const AMOUNT = 1_000_000_000n; // 1,000 USDC @ 6dp
const seen = new Map<string, number>();
const solBudget: SolBudget = { windowStart: 0, spent: 0 };
export async function POST(req: NextRequest) {
  let pubkey: unknown;
  try { ({ pubkey } = await req.json()); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }
  if (!isValidPubkey(pubkey)) return NextResponse.json({ error: "invalid pubkey" }, { status: 400 });
  if (!allow(pubkey, seen, Date.now())) return NextResponse.json({ error: "throttled" }, { status: 429 });
  const conn = getConnection();
  // trim(): env managers that read values from stdin (e.g. `vercel env add < file`) keep a
  // trailing newline, and bs58.decode throws "Non-base58 character" on any whitespace.
  const authority = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(process.env.FAUCET_AUTHORITY_SECRET!.trim())));
  const owner = new PublicKey(pubkey);
  const ata = await getOrCreateAssociatedTokenAccount(conn, authority, USDC_MINT, owner);
  const sig = await mintTo(conn, authority, USDC_MINT, ata.address, authority, Number(AMOUNT));
  const sol = await conn.getBalance(owner);
  let solGranted = false;
  if (sol === 0 && allowSolGrant(solBudget, Date.now(), SOL_GRANT_LAMPORTS)) {
    const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: owner, lamports: SOL_GRANT_LAMPORTS }));
    await sendAndConfirmTransaction(conn, tx, [authority]);
    solGranted = true;
  }
  return NextResponse.json({ sig, ata: ata.address.toBase58(), amount: AMOUNT.toString(), solGranted });
}
