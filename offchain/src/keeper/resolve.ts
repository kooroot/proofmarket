import { Connection, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "node:fs";
import { buildResolveArgs } from "./resolveArgs.ts";
import { epochDayFromTs, dailyScoresRootsPda, TXORACLE_PROGRAM_ID } from "./epochDay.ts";
import { readGolden } from "./cache.ts";
import { marketPda } from "../catalog/pda.ts";

interface BuildOpts {
  goldenPath: string;
  marketId: bigint;
  resolver: PublicKey;
}

/** Assemble the resolve() methods builder. Positional order MUST match P1: ts, summary, fixtureProof, mainTreeProof, statA, statB. */
export function buildResolveCall(program: any, opts: BuildOpts) {
  const golden = readGolden(opts.goldenPath);
  const a = buildResolveArgs(golden.bundle);
  const rootsPda = dailyScoresRootsPda(epochDayFromTs(golden.bundle.ts));
  const market = marketPda(opts.marketId);
  return program.methods
    .resolve(a.ts, a.fixtureSummary, a.fixtureProof, a.mainTreeProof, a.statA, a.statB)
    .accounts({
      resolver: opts.resolver,
      market,
      dailyScoresMerkleRoots: rootsPda,
      txoracleProgram: TXORACLE_PROGRAM_ID,
    })
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })]);
}

/** One-shot: build resolve() from a cached golden bundle and submit it. Returns the tx signature. */
export async function resolveMarket(opts: {
  rpcUrl: string;
  keeper: Keypair;
  idlPath: string; // P1 target/idl/proofmarket.json
  goldenPath: string;
  marketId: bigint;
}): Promise<string> {
  const connection = new Connection(opts.rpcUrl, "confirmed");
  const idl = JSON.parse(readFileSync(opts.idlPath, "utf8"));
  const provider = new AnchorProvider(connection, new Wallet(opts.keeper), { commitment: "confirmed" });
  const program = new Program(idl, provider);
  const sig = await buildResolveCall(program, {
    goldenPath: opts.goldenPath,
    marketId: opts.marketId,
    resolver: opts.keeper.publicKey,
  }).rpc();
  return sig;
}
