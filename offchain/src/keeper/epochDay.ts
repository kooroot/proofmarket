import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const MS_PER_DAY = 86_400_000;

/** epochDay = floor(ts / 86_400_000); ts is the bundle top-level ts (§3.5a). Must fit u16. */
export function epochDayFromTs(ts: number): number {
  const day = Math.floor(ts / MS_PER_DAY);
  if (day < 0 || day > 0xffff) throw new Error(`epochDay ${day} out of u16 range (ts=${ts})`);
  return day;
}

/** daily_scores_roots PDA seeds = [b"daily_scores_roots", epochDay u16 LE], owner = txoracle. */
export function dailyScoresRootsPda(epochDay: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID,
  );
  return pda;
}
