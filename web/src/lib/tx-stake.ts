import { PublicKey } from "@solana/web3.js";
import { BN, type Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Proofmarket } from "@/idl/proofmarket";
import { USDC_MINT, MIN_STAKE } from "./constants";
import { vaultPda, positionPda } from "./market";
export function validateStakeAmount(amountBase: bigint): "ZeroAmount" | "StakeTooSmall" | null {
  if (amountBase <= 0n) return "ZeroAmount";
  if (amountBase < MIN_STAKE) return "StakeTooSmall";
  return null;
}
export async function buildStakeIx(program: Program<Proofmarket>, args: { market: PublicKey; side: boolean; amountBase: bigint; owner: PublicKey }) {
  const userAta = getAssociatedTokenAddressSync(USDC_MINT, args.owner);
  return program.methods.stake(args.side, new BN(args.amountBase.toString()))
    .accountsPartial({ market: args.market, position: positionPda(args.market, args.owner), vault: vaultPda(args.market), mint: USDC_MINT, userTokenAccount: userAta, user: args.owner })
    .instruction();
}
