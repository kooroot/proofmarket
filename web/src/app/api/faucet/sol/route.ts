import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getConnection } from "@/lib/connection";
import { getTxlineSettlementNetworkConfig } from "@/lib/txline-network";
import {
  allow,
  allowSolGrant,
  isValidPubkey,
  SOL_GRANT_LAMPORTS,
  type SolBudget,
} from "../usdc/throttle";

const seen = new Map<string, number>();
const solBudget: SolBudget = { windowStart: 0, spent: 0 };

export async function POST(req: NextRequest) {
  let pubkey: unknown;
  try {
    ({ pubkey } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!isValidPubkey(pubkey)) {
    return NextResponse.json({ error: "invalid pubkey" }, { status: 400 });
  }

  if (getTxlineSettlementNetworkConfig().network !== "devnet") {
    return NextResponse.json(
      { error: "SOL gas faucet is devnet-only" },
      { status: 409 }
    );
  }

  const conn = getConnection();
  const owner = new PublicKey(pubkey);
  const balance = await conn.getBalance(owner);
  if (balance >= SOL_GRANT_LAMPORTS) {
    return NextResponse.json({
      solGranted: false,
      balanceLamports: balance,
      lamports: "0",
    });
  }

  if (!allow(pubkey, seen, Date.now())) {
    return NextResponse.json({ error: "throttled" }, { status: 429 });
  }

  if (!allowSolGrant(solBudget, Date.now(), SOL_GRANT_LAMPORTS)) {
    return NextResponse.json({ error: "SOL faucet budget exhausted" }, { status: 429 });
  }

  const secret = process.env.FAUCET_AUTHORITY_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "faucet authority not configured" }, { status: 500 });
  }

  const authority = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(secret)));
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: owner,
      lamports: SOL_GRANT_LAMPORTS,
    })
  );
  const sig = await sendAndConfirmTransaction(conn, tx, [authority]);

  return NextResponse.json({
    sig,
    solGranted: true,
    balanceLamports: balance,
    lamports: SOL_GRANT_LAMPORTS.toString(),
  });
}
