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
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  {
    id: 5,
    label: "P2 goals > 0",
    statA: 2,
    statB: null,
    op: null,
    threshold: 0,
  },
  {
    id: 6,
    label: "P1 corners > 0",
    statA: 7,
    statB: null,
    op: null,
    threshold: 0,
  },
  {
    id: 7,
    label: "P2 corners > 0",
    statA: 8,
    statB: null,
    op: null,
    threshold: 0,
  },
] as const;

function loadProofMarketIdl(): anchor.Idl {
  const candidates = [
    resolve("target/idl/proofmarket.json"),
    resolve("web/src/idl/proofmarket.json"),
  ];
  const idlPath = candidates.find((path) => existsSync(path));
  if (!idlPath) {
    throw new Error(`ProofMarket IDL not found at ${candidates.join(" or ")}`);
  }
  return JSON.parse(readFileSync(idlPath, "utf8")) as anchor.Idl;
}

function legacyCreateMarketIdl(): anchor.Idl {
  const idl = loadProofMarketIdl() as anchor.Idl & {
    instructions: Array<{ name: string; args: unknown[] }>;
  };
  const createIx = idl.instructions.find((ix) => ix.name === "create_market");
  if (!createIx) throw new Error("create_market instruction not found in IDL");
  createIx.args = [
    { name: "market_id", type: "u64" },
    { name: "fixture_id", type: "i64" },
    { name: "stat_a_key", type: "u32" },
    { name: "stat_a_period", type: "i32" },
    { name: "threshold", type: "i32" },
    { name: "comparison", type: "u8" },
    { name: "resolve_after_ts_ms", type: "i64" },
    { name: "fee_bps", type: "u16" },
  ];
  return idl;
}

function readJsonKeypair(path: string): Keypair {
  const raw = readFileSync(path, "utf8").trim();
  const end = raw.lastIndexOf("]");
  if (end < 0) throw new Error(`Keypair JSON array not found at ${path}`);
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(raw.slice(0, end + 1)))
  );
}

function loadMintAuthority(fallback: Keypair): Keypair {
  const faucetPath = resolve("keys/faucet-authority.json");
  return existsSync(faucetPath) ? readJsonKeypair(faucetPath) : fallback;
}

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(loadProofMarketIdl(), provider);
  const createProgram = new anchor.Program(legacyCreateMarketIdl(), provider);
  const deployer = (provider.wallet as anchor.Wallet).payer;
  const mintAuthority = loadMintAuthority(deployer);
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
  console.log("mintAuthority:", mintAuthority.publicKey.toBase58());

  const targetYes = 60_000_000;
  const targetNo = 40_000_000;
  const pause = () => new Promise((resolve) => setTimeout(resolve, 750));

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
      const createSig = await createProgram.methods
        .createMarket(
          marketId,
          FIXTURE_ID,
          def.statA,
          STAT_PERIOD,
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

    let m: any = await program.account.market.fetch(market);
    const topUps: [string, boolean, number][] = [];
    const yesNeeded = Math.max(0, targetYes - m.yesPool.toNumber());
    const noNeeded = Math.max(0, targetNo - m.noPool.toNumber());
    if (yesNeeded > 0) topUps.push(["YES_TOPUP", true, yesNeeded]);
    if (noNeeded > 0) topUps.push(["NO_TOPUP", false, noNeeded]);

    if (topUps.length > 0) {
      for (const [name, side, amount] of topUps) {
        const u = Keypair.generate();
        await fundSol(u.publicKey, 20_000_000); // 0.02 SOL: covers Position rent + tx fee (deployer pays the ATA)
        await pause();
        const ata = await createAssociatedTokenAccount(
          provider.connection,
          deployer,
          MINT,
          u.publicKey
        );
        await pause();
        await mintTo(
          provider.connection,
          deployer,
          MINT,
          ata,
          mintAuthority,
          amount
        ); // authority = current mint authority
        await pause();
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
        await pause();
      }
    }

    // Verify on-chain state.
    m = await program.account.market.fetch(market);
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

    if (created || topUps.length > 0) {
      const ok =
        m.yesPool.toNumber() >= targetYes &&
        m.noPool.toNumber() >= targetNo &&
        vaultBal >= targetYes + targetNo;
      console.log(
        ok
          ? "SEED OK: YES >= 60 / NO >= 40 / vault >= 100 USDC"
          : "SEED MISMATCH"
      );
      if (!ok) process.exit(1);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
