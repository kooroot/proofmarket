import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "node:fs";
import { resolveMarket } from "../src/keeper/resolve.ts";
import { marketPda } from "../src/catalog/pda.ts";

const RPC = process.env.RPC ?? "https://api.devnet.solana.com";
const idlPath = process.env.PROOFMARKET_IDL!;        // P1 target/idl/proofmarket.json
const goldenPath = process.env.GOLDEN!;              // cache/golden/18172280-1068-1.json
const marketId = BigInt(process.env.MARKET_ID!);
const keeper = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEEPER_KEY!, "utf8"))));

const sig = await resolveMarket({ rpcUrl: RPC, keeper, idlPath, goldenPath, marketId });
console.log("RESOLVE TX:", sig);

const idl = JSON.parse(readFileSync(idlPath, "utf8"));
const program = new Program(idl, new AnchorProvider(new Connection(RPC, "confirmed"), new Wallet(keeper), {}));
const m: any = await (program.account as any).market.fetch(marketPda(marketId));
console.log("market.state =", m.state, " outcome =", m.outcome, " resolveTs =", m.resolveTs?.toString());
