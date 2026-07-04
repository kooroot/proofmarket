"use client";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { getProgram } from "@/lib/program";
import { positionPda, type UiMarket } from "@/lib/market";

export interface UiPosition {
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
  pda: string;
}

export interface PortfolioPosition {
  market: UiMarket;
  position: UiPosition;
}

export function usePortfolioPositions(markets: UiMarket[]) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const marketKeys = markets.map((m) => m.pda).join(",");

  return useQuery<PortfolioPosition[]>({
    enabled: !!wallet && markets.length > 0,
    queryKey: ["portfolioPositions", wallet?.publicKey.toBase58(), marketKeys],
    queryFn: async () => {
      const provider = new AnchorProvider(connection, wallet!, {});
      const program = getProgram(provider);
      const rows = await Promise.all(
        markets.map(async (market) => {
          const pda = positionPda(new PublicKey(market.pda), wallet!.publicKey);
          const acc = await program.account.position.fetchNullable(pda);
          if (!acc) return null;
          return {
            market,
            position: {
              yesAmount: BigInt(acc.yesAmount.toString()),
              noAmount: BigInt(acc.noAmount.toString()),
              claimed: acc.claimed,
              pda: pda.toBase58(),
            },
          };
        }),
      );
      return rows.filter((row): row is PortfolioPosition => row !== null);
    },
  });
}
