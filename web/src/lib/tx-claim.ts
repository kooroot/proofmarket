import { PublicKey } from "@solana/web3.js";
import { type Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Proofmarket } from "@/idl/proofmarket";
import { USDC_MINT } from "./constants";
import { vaultPda, positionPda, STATE, type UiMarket } from "./market";
export function claimable(m: Pick<UiMarket, "state">, pos: { claimed: boolean }): boolean {
  return m.state === STATE.Resolved && !pos.claimed; // §4.5: losers also close their rent (payout 0)
}
export async function buildClaimIx(program: Program<Proofmarket>, args: { market: PublicKey; owner: PublicKey }) {
  const userAta = getAssociatedTokenAddressSync(USDC_MINT, args.owner);
  return program.methods.claim()
    .accountsPartial({ market: args.market, position: positionPda(args.market, args.owner), vault: vaultPda(args.market), mint: USDC_MINT, userTokenAccount: userAta, user: args.owner })
    .instruction();
}
