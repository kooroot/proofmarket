// Lands a standalone validate_stat tx on devnet against the REAL txoracle, using the frozen
// golden proof bundle — the on-chain counterpart of the hermetic bankrun CPI proof. Landed
// 2026-07-02: tx 3PwENbNmQBESsnzYWrrcEwGvqfug4ZWmHZeMr7PBRJxtoGUNbyoPPiG6VeDjxGGCA2ZQmNNpUysx2mLiYUMypTMy
// (Program return: 6pW64g… AQ== → TRUE). Judges can re-land it themselves:
//
//   anchor idl fetch 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J -o offchain/src/idl/txoracle.json \
//     --provider.cluster devnet          # the IDL is fetched, not shipped (gitignored)
//   bun scripts/land-validate-stat.ts    # needs a funded keys/devnet-deployer.json (fee only, ~5k lamports)
//
// Note the ComputeBudget ix below: validate_stat consumes ~205k CU even for this small proof,
// which EXCEEDS the 200k default per-instruction budget — without it the tx dies at the CU meter.
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import IDL from "../offchain/src/idl/txoracle.json";

const RPC = "https://api.devnet.solana.com";
const DAILY_ROOT = new PublicKey("BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe");

(async () => {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(__dirname + "/../keys/devnet-deployer.json", "utf8")))
  );
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed" });
  const program = new anchor.Program(IDL as anchor.Idl, provider);

  const g = JSON.parse(readFileSync(__dirname + "/../golden/validate-stat-args.json", "utf8"));
  const node = (n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling });

  const sig = await program.methods
    .validateStat(
      new BN(g.ts),
      {
        fixtureId: new BN(g.fixtureSummary.fixtureId),
        updateStats: {
          updateCount: g.fixtureSummary.updateStats.updateCount,
          minTimestamp: new BN(g.fixtureSummary.updateStats.minTimestamp),
          maxTimestamp: new BN(g.fixtureSummary.updateStats.maxTimestamp),
        },
        eventsSubTreeRoot: g.fixtureSummary.eventsSubTreeRoot,
      },
      g.fixtureProof.map(node),
      g.mainTreeProof.map(node),
      { threshold: 0, comparison: { greaterThan: {} } }, // P1 goals > 0 — golden value is 1 → TRUE
      {
        statToProve: { key: g.statA.statToProve.key, value: g.statA.statToProve.value, period: g.statA.statToProve.period },
        eventStatRoot: g.statA.eventStatRoot,
        statProof: g.statA.statProof.map(node),
      },
      null,
      null
    )
    .accounts({ dailyScoresMerkleRoots: DAILY_ROOT })
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })])
    .rpc();

  console.log("SIG", sig);
  const tx = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
  const ret = tx?.meta?.logMessages?.filter((l) => l.includes("Program return") || l.includes("Predicate"));
  console.log(ret?.join("\n"));
})().catch((e) => { console.error(String(e).slice(0, 800)); process.exit(1); });
