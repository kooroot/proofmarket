"use client";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { getProgram } from "@/lib/program";
import { positionPda } from "@/lib/market";
export function usePosition(marketPda: string | undefined) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useQuery({
    enabled: !!marketPda && !!wallet,
    queryKey: ["position", marketPda, wallet?.publicKey.toBase58()],
    queryFn: async () => {
      const provider = new AnchorProvider(connection, wallet!, {});
      const program = getProgram(provider);
      const pda = positionPda(new PublicKey(marketPda!), wallet!.publicKey);
      const acc = await program.account.position.fetchNullable(pda);
      return acc ? { yesAmount: BigInt(acc.yesAmount.toString()), noAmount: BigInt(acc.noAmount.toString()), claimed: acc.claimed, pda: pda.toBase58() } : null;
    },
  });
}
