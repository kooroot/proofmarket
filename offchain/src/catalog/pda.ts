import { PublicKey } from "@solana/web3.js";

/** Phase-1 deployed program id. Read from env until the program is deployed/IDL committed. */
export const PROOFMARKET_PROGRAM_ID = new PublicKey(
  process.env.PROOFMARKET_PROGRAM_ID ?? "11111111111111111111111111111111",
);

function u64le(id: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(id, 0);
  return b;
}

/** Market PDA seeds = [b"market", market_id u64 LE] (canonical — mirrors create_market.rs:31). */
export function marketPda(marketId: bigint): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), u64le(marketId)],
    PROOFMARKET_PROGRAM_ID,
  );
  return pda;
}

/** Vault PDA seeds = [b"vault", market.key().as_ref()] (canonical — keyed on the Market account; create_market.rs:36). */
export function vaultPda(market: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), market.toBuffer()],
    PROOFMARKET_PROGRAM_ID,
  );
  return pda;
}
