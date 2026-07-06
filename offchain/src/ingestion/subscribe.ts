/**
 * Step 2 of the 4-step access flow: the on-chain `subscribe` transaction.
 *
 * subscribe(service_level_id: u16, weeks: u8)  — CONFIRMED from idl/txoracle.json + example.
 * Accounts (exact order/names) and PDA seeds are CONFIRMED (findings §e):
 *   user (signer,writable) | pricing_matrix | token_mint | user_token_account (writable)
 *   | token_treasury_vault (writable) | token_treasury_pda | token_program
 *   | system_program | associated_token_program
 *
 * The ONE thing this file cannot ship: the IDL JSON itself. Fetch it with
 *   anchor idl fetch <TXORACLE_PROGRAM_ID> --provider.cluster <devnet|mainnet-beta> -o ./idl/txoracle.json
 * (see README). Generated TS types are optional but recommended.
 */
import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { findTxlineNetworkByProgramId, txlineExplorerTx } from "./network.ts";

// CONFIRMED PDA seeds (idl/txoracle.json + subscribe.ts example, findings §e).
const PRICING_MATRIX_SEED = "pricing_matrix";
const TOKEN_TREASURY_SEED = "token_treasury_v2";

export interface SubscribeConfig {
  rpcUrl: string;
  programId: string;
  txlMint: string;
  /** indexes PricingMatrix.rows (row_id, u16). See findings §B — confirm free tier at runtime. */
  serviceLevelId: number;
  /** u8; spec says multiple of 4, examples use 1 (findings §C). */
  durationWeeks: number;
  /** Path to the IDL fetched via `anchor idl fetch`. */
  idlPath?: string;
}

// TODO: replace `Idl` with the generated `Txoracle` type (`anchor` type gen) for full type-safety
//       on `program.methods.subscribe(...)` and `program.account.pricingMatrix.fetch(...)`.
type TxoracleProgram = Program<Idl>;

function loadProgram(cfg: SubscribeConfig, connection: Connection, wallet: Keypair): TxoracleProgram {
  const idlPath = cfg.idlPath ?? new URL("../idl/txoracle.json", import.meta.url).pathname;
  let idl: Idl & { address?: string };
  try {
    idl = JSON.parse(readFileSync(idlPath, "utf8"));
  } catch {
    const cluster = findTxlineNetworkByProgramId(cfg.programId) === "mainnet" ? "mainnet-beta" : "devnet";
    throw new Error(
      `IDL not found at ${idlPath}. Run:\n` +
        `  anchor idl fetch ${cfg.programId} --provider.cluster ${cluster} -o ./idl/txoracle.json`,
    );
  }
  // IDL ships the mainnet address; point it at the configured (devnet) program.
  idl.address = cfg.programId;
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  return new Program(idl as Idl, provider);
}

/** Derive the subscribe account set. Pure + side-effect-free except the user-ATA create. */
async function deriveAccounts(
  program: TxoracleProgram,
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
) {
  const programId = program.programId;

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PRICING_MATRIX_SEED)],
    programId,
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_TREASURY_SEED)],
    programId,
  );

  // Treasury vault = ATA owned by an off-curve PDA → allowOwnerOffCurve = true.
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    mint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
  );

  // User ATA must exist; creating it costs rent (hence a FUNDED wallet).
  const userAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey,
    false,
    "confirmed",
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );

  return { pricingMatrixPda, tokenTreasuryPda, tokenTreasuryVault, userTokenAccount: userAta.address };
}

/** Best-effort: print the on-chain service-level menu so a human can pick the free tier (findings §B). */
async function logServiceLevels(program: TxoracleProgram, pricingMatrixPda: PublicKey): Promise<void> {
  try {
    // `pricingMatrix` account name + ServiceRow fields are CONFIRMED from the IDL.
    // Cast through unknown because we ship without generated account types.
    const matrix = (await (program.account as any).pricingMatrix.fetch(pricingMatrixPda)) as {
      rows: Array<{
        rowId: number;
        pricePerWeekToken: { toString(): string } | number;
        samplingIntervalSec: number;
        leagueBundleId: number;
        marketBundleId: number;
      }>;
    };
    console.log("Service levels (PricingMatrix.rows) — pricePerWeekToken==0 means free tier:");
    console.table(
      matrix.rows.map((r) => ({
        rowId: r.rowId,
        tokensPerWeek: Number(r.pricePerWeekToken.toString()) / 1_000_000, // TOKEN_DECIMALS=6
        samplingSec: r.samplingIntervalSec,
        leagueBundle: r.leagueBundleId,
        marketBundle: r.marketBundleId,
      })),
    );
  } catch (e) {
    console.warn("Could not read PricingMatrix (non-fatal):", (e as Error).message);
  }
}

/**
 * Build, send, and confirm the subscribe() transaction. Returns the tx signature.
 * The wallet is the fee payer and signer.
 */
export async function subscribe(cfg: SubscribeConfig, wallet: Keypair): Promise<string> {
  const connection = new Connection(cfg.rpcUrl, "confirmed");
  const mint = new PublicKey(cfg.txlMint);
  const program = loadProgram(cfg, connection, wallet);

  const { pricingMatrixPda, tokenTreasuryPda, tokenTreasuryVault, userTokenAccount } =
    await deriveAccounts(program, connection, wallet, mint);

  await logServiceLevels(program, pricingMatrixPda);

  console.log(
    `Subscribing on-chain: service_level_id=${cfg.serviceLevelId}, weeks=${cfg.durationWeeks}`,
  );

  // TODO: with the generated `Txoracle` type this cast disappears and args/accounts are checked.
  const methods = program.methods as Record<
    string,
    (...args: number[]) => { accounts(a: Record<string, PublicKey>): { rpc(): Promise<string> } }
  >;
  const txSig = await methods
    .subscribe!(cfg.serviceLevelId, cfg.durationWeeks) // (u16, u8)
    .accounts({
      user: wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: mint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const network = findTxlineNetworkByProgramId(cfg.programId) ?? "devnet";
  console.log(`subscribe confirmed: ${txSig}`);
  console.log(`Explorer: ${txlineExplorerTx(txSig, network)}`);
  return txSig;
}
