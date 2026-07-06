import { BN } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import {
  setup,
  makeMint,
  fundUser,
  marketPda,
  vaultPda,
  positionPda,
  warpToUnix,
  loadGolden,
  ROOT_PUBKEY,
  TXORACLE_ID,
} from "../../tests/helpers";

/**
 * Canonical P4.2 replay vector — frozen so P4.3/P4.4/A.7 reproduce identical payouts.
 * YES pool = 40 + 20 = 60 USDC; NO pool = 40 USDC. threshold=0/comparison=0 => provenValue 1 > 0
 * => YES wins. fee = floor(losingPool 40_000_000 * 100 / 10_000) = 400_000 (on the LOSING pool).
 * payoutPool = 60_000_000 + (40_000_000 - 400_000) = 99_600_000. A -> 66_400_000, C -> 33_200_000,
 * B (loser) -> 0, vault residual (fee) = 400_000.
 */
export const RUN_DEFAULTS = {
  fixtureId: 18172280,
  epochDay: 20634,
  statKey: 1,
  statPeriod: 7,
  feeBps: 100,
  stakes: [
    { side: true, amount: 40_000_000 }, // A YES 40 USDC
    { side: true, amount: 20_000_000 }, // C YES 20 USDC
    { side: false, amount: 40_000_000 }, // B NO 40 USDC
  ],
} as const;

export interface RunOpts {
  /** Override the market id (default new BN(20634001)). */
  marketId?: BN;
  /** Override fee basis points (default RUN_DEFAULTS.feeBps = 100). */
  feeBps?: number;
  /** Run the claims after resolve (default true). */
  claim?: boolean;
}

export interface RunResult {
  context: any; // bankrun ProgramTestContext (query balances via context.banksClient in P4.2)
  program: any; // anchor Program (fetch accounts, etc.)
  market: PublicKey;
  vault: PublicKey;
  marketAccount: any; // fetched Market after resolve (state/outcome/pools/fee/epochDay/dailyRoot)
  burners: { kp: Keypair; side: boolean; amount: number; ata: PublicKey }[];
  resolveTxSig: string;
  claimTxSigs: string[];
  dailyRootOnChain: number[];
  resolveEvent: null; // events don't fire under bankrun; read marketAccount fields instead
  bundle: ReturnType<typeof loadGolden>;
}

/**
 * Hermetic bankrun lifecycle replay: create -> stake x3 -> resolve(golden CPI) -> claim.
 * Deterministic (no validator, no network, no real clock). Mirrors tests/resolve.ts + tests/claim.ts.
 */
export async function runEndToEnd(opts: RunOpts = {}): Promise<RunResult> {
  const { context, program, payer } = await setup();
  const g = loadGolden();

  const marketId = opts.marketId ?? new BN(20634001);
  const feeBps = opts.feeBps ?? RUN_DEFAULTS.feeBps;
  const doClaim = opts.claim ?? true;

  // Clock: create BEFORE the lock boundary (like tests/resolve.ts).
  const createClock = Math.floor(g.maxTsMs / 1000) - 120;
  const resolveAfterMs = g.maxTsMs - 1000; // <= maxTs so the finality gate is satisfiable
  await warpToUnix(context, createClock);

  const mint = await makeMint(context, payer);
  // fee_destination is a USDC ATA (0 balance is fine) — NEVER a wallet pubkey (Contract fix #5).
  const feeDestination = await fundUser(context, payer, mint, Keypair.generate(), 0n);

  const market = marketPda(marketId);
  const vault = vaultPda(market);

  // create_market: (id, fixtureId, statAKey, statAPeriod, threshold, comparison, resolveAfterTsMs, feeBps)
  await program.methods
    .createMarket(marketId, new BN(g.raw.fixtureId), g.raw.statKey, g.raw.statPeriod, null, null, null, 0, 0, new BN(resolveAfterMs), feeBps)
    .accounts({ creator: payer.publicKey, market, vault, mint, feeDestination })
    .rpc();

  // stake x3: fund each burner's ATA to exactly its stake, then stake it (signer key = `user`).
  const burners: { kp: Keypair; side: boolean; amount: number; ata: PublicKey }[] = [];
  for (const { side, amount } of RUN_DEFAULTS.stakes) {
    const kp = Keypair.generate();
    const ata = await fundUser(context, payer, mint, kp, BigInt(amount));
    await program.methods
      .stake(side, new BN(amount))
      .accounts({ user: kp.publicKey, market, position: positionPda(market, kp.publicKey), vault, userTokenAccount: ata, mint })
      .signers([kp])
      .rpc();
    burners.push({ kp, side, amount, ata });
  }

  // Warp past resolve_after, then resolve via the golden validate_stat CPI.
  // ROOT_PUBKEY === dailyRootPda(RUN_DEFAULTS.epochDay) (asserted in tests/replay-run.unit.ts).
  await warpToUnix(context, Math.ceil(g.maxTsMs / 1000) + 1);
  const resolveTxSig = await program.methods
    .resolve(g.args.ts, g.args.fixtureSummary, g.args.fixtureProof, g.args.mainTreeProof, g.args.statA, g.args.statB)
    .accounts({ resolver: payer.publicKey, market, dailyScoresMerkleRoots: ROOT_PUBKEY, txoracleProgram: TXORACLE_ID })
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
    .rpc();

  const marketAccount = await program.account.market.fetch(market);
  const rootAcc = await context.banksClient.getAccount(ROOT_PUBKEY);
  const dailyRootOnChain = rootAcc ? Array.from(rootAcc.data as Uint8Array) : [];

  // Claim all burners (winners pull pro-rata; the loser gets 0 and its position closes).
  const claimTxSigs: string[] = [];
  if (doClaim) {
    for (const { kp, ata } of burners) {
      const sig = await program.methods
        .claim()
        .accounts({ user: kp.publicKey, market, position: positionPda(market, kp.publicKey), vault, userTokenAccount: ata, mint })
        .signers([kp])
        .rpc();
      claimTxSigs.push(sig);
    }
  }

  return { context, program, market, vault, marketAccount, burners, resolveTxSig, claimTxSigs, dailyRootOnChain, resolveEvent: null, bundle: g };
}
