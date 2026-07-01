// Devnet deploy verification (read-only — no wallet needed). Confirms the live surface a judge
// would see: proofmarket deployed at declare_id, the pinned test-USDC mint, the canonical txoracle
// daily-scores root (the settlement anchor), and the seeded OPEN demo market (golden 60/40 vector).
//
//   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npx ts-node --transpile-only scripts/check-deploy.ts
//
// Exit 0 = GO (every on-chain item present + correct). Exit 1 = NO-GO.
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import IDL from "../target/idl/proofmarket.json";

const RPC = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const PROGRAM = new PublicKey("6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb");
const MINT = new PublicKey("2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT");
const TXORACLE = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const DAILY_ROOT = new PublicKey("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");
const DEPLOYER = new PublicKey("7jKowNzrDTttsVEVGJzDpvX19H2hpWsxYcZix5feKxSg");
const MARKET_ID = new BN(1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if ((!String(e).includes("429") && !String(e).includes("Too Many")) || i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error("unreachable");
}

let fails = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? "  — " + detail : ""}`);
  if (!ok) fails++;
};

(async () => {
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(Keypair.generate()), { commitment: "confirmed" });
  const program = new anchor.Program(IDL as anchor.Idl, provider);
  const seed = (t: string, k: Buffer[]) => PublicKey.findProgramAddressSync([Buffer.from(t), ...k], PROGRAM)[0];
  const market = seed("market", [MARKET_ID.toArrayLike(Buffer, "le", 8)]);
  const vault = seed("vault", [market.toBuffer()]);

  console.log(`\n== ProofMarket devnet deploy check (${RPC}) ==`);

  const prog = await withRetry(() => connection.getAccountInfo(PROGRAM));
  check("proofmarket program deployed at declare_id", !!prog && prog.executable, prog ? `${prog.data.length}B, executable` : "not found");

  try {
    const mint = await withRetry(() => getMint(connection, MINT));
    check("pinned test-USDC mint", mint.decimals === 6 && !!mint.mintAuthority?.equals(DEPLOYER),
      `decimals ${mint.decimals}, authority ${mint.mintAuthority?.toBase58().slice(0, 8)}…`);
  } catch { check("pinned test-USDC mint", false, "not found"); }

  const root = await withRetry(() => connection.getAccountInfo(DAILY_ROOT));
  check("canonical txoracle daily-scores root (settlement anchor)", !!root && root.owner.equals(TXORACLE),
    root ? `owner ${root.owner.toBase58().slice(0, 8)}…` : "not found");

  try {
    const m: any = await withRetry(() => program.account.market.fetch(market));
    const vaultBal = Number((await withRetry(() => connection.getTokenAccountBalance(vault))).value.amount);
    check("demo market seeded + OPEN", m.state === 0, `state ${m.state}`);
    check("golden pools (YES 60 / NO 40 USDC)", m.yesPool.toNumber() === 60_000_000 && m.noPool.toNumber() === 40_000_000,
      `YES ${m.yesPool.toNumber() / 1e6} / NO ${m.noPool.toNumber() / 1e6}`);
    check("3 staked positions", m.totalPositions === 3, `pos ${m.totalPositions}`);
    check("vault holds 100 USDC escrow", vaultBal === 100_000_000, `${vaultBal / 1e6} USDC`);
    console.log(`\n  market PDA: ${market.toBase58()}`);
  } catch (e) { check("demo market seeded", false, "fetch failed: " + String(e).slice(0, 60)); }

  console.log(fails === 0 ? "\nCHECK-DEPLOY: GO ✓ — live devnet surface verified" : `\nCHECK-DEPLOY: NO-GO ✗ — ${fails} check(s) failed`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error(String(e)); process.exit(1); });
